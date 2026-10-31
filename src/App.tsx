import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/app-header';
import { AppSidebar, type Segment, type TripRow } from '@/components/app-sidebar';
import type { NewBreak } from '@/components/insights-dialog';
import { SettingsButton, SettingsPanel } from '@/components/settings-panel';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TripPopover } from '@/components/trip-popover';
import { YearCalendar } from '@/components/year-calendar';
import { isMobileViewport, useIsMobile } from '@/hooks/use-mobile';
import { useYearScroller } from '@/hooks/use-year-scroller';
import { buildContext, buildYear, count, draftRange, ownMap, type DayCell, type YearModel } from '@/lib/calendar';
import { daysBetween, eachDay, fmt, iso, yearOf } from '@/lib/dates';
import { countHolidays, toHolidayMap, type HolidayLookup, type HolidayMap } from '@/lib/holidays';
import { holidayStore } from '@/lib/holidayStore';
import { PALETTE } from '@/lib/palette';
import { load, save } from '@/lib/storage';
import type { Draft, Settings, Trip } from '@/lib/types';
import { plural } from '@/lib/utils';

// The insights dialog and everything only it needs load as their own chunk the first time it opens.
const InsightsDialog = lazy(() => import('@/components/insights-dialog'));

const MIN_YEAR = 1950;
const MAX_YEAR = 2099;
const TODAY = new Date();
const THIS_YEAR = Math.min(MAX_YEAR, Math.max(MIN_YEAR, TODAY.getFullYear()));
const THIS_MONTH = TODAY.getMonth();
const TODAY_KEY = iso(TODAY.getFullYear(), THIS_MONTH, TODAY.getDate());
const EMPTY_DRAFT: Draft = { id: '', name: '', from: '', to: '' };
const SIDEBAR_STYLE = { '--sidebar-width': '18rem', '--settings-width': '20rem' } as CSSProperties;

export function App() {
  const [initial] = useState(() => load());
  const [trips, setTrips] = useState<Trip[]>(initial.trips);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  // The day the trip popover sits on: the day clicked last, or the end of a range picked in its date picker.
  const [anchorKey, setAnchorKey] = useState('');
  const [err, setErr] = useState('');
  // On phones the months stack in one column, so "today" is the current month there; on wider screens it is the year.
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const [startMonth] = useState(() => (isMobileViewport() ? THIS_MONTH : null));
  const scroller = useYearScroller(THIS_YEAR, MIN_YEAR, MAX_YEAR, startMonth);
  const { year, month, yFrom, yTo, jumpTo } = scroller;
  const atToday = year === THIS_YEAR && (!isMobile || month === THIS_MONTH);
  const goToday = () => jumpTo(THIS_YEAR, true, isMobile ? THIS_MONTH : undefined);

  // ---- The insights dialog, opened for a year from the button in its heading; mounted, and so loaded, on the first open.
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsMounted, setInsightsMounted] = useState(false);
  const [insightsYear, setInsightsYear] = useState(THIS_YEAR);
  const openInsights = useCallback((y: number) => {
    setInsightsYear(y);
    setInsightsMounted(true);
    setInsightsOpen(true);
  }, []);

  // ---- The settings panel: a column beside the calendar on wider screens, a sheet on phones, each with its own open state
  // like the sidebar's open and openMobile. Both start closed and are not remembered.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMobile, setSettingsMobile] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const toggleSettings = () => (isMobile ? setSettingsMobile((v) => !v) : setSettingsOpen((v) => !v));

  // ---- Persistence: write after every change to trips or settings (not on first load).
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    save({ trips, settings });
  }, [trips, settings]);

  // ---- Public holidays, computed locally once the rules are loaded (see holidayStore).
  const holidayVersion = useSyncExternalStore(holidayStore.subscribe, holidayStore.getVersion);
  const [pa, pb] = draftRange(draft.from, draft.to);
  useEffect(() => {
    if (settings.holidays) holidayStore.load();
  }, [settings.holidays]);

  const lookup = useMemo<HolidayLookup>(() => {
    const maps = new Map<number, HolidayMap>();
    return (y: number) => {
      let m = maps.get(y);
      if (!m) {
        m = settings.holidays ? toHolidayMap(holidayStore.get(settings.country, settings.region, y) ?? [], y) : {};
        maps.set(y, m);
      }
      return m;
    };
    // holidayVersion changes when the rules arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.holidays, settings.country, settings.region, holidayVersion]);

  // ---- Year models, cached until trips, the draft, settings or holiday data change.
  const own = useMemo(() => ownMap(trips), [trips]);
  const ownRef = useRef(own);
  ownRef.current = own;
  const ctx = useMemo(() => buildContext(own, draft.from, draft.to, settings, lookup, draft.id), [own, draft.from, draft.to, settings, lookup, draft.id]);
  const cacheRef = useRef<{ ctx: typeof ctx; years: Map<number, YearModel> } | null>(null);
  if (!cacheRef.current || cacheRef.current.ctx !== ctx) cacheRef.current = { ctx, years: new Map() };
  const cache = cacheRef.current.years;
  const yearModel = (y: number): YearModel => {
    let m = cache.get(y);
    if (!m) {
      m = buildYear(y, ctx);
      cache.set(y, m);
    }
    return m;
  };
  const years: YearModel[] = [];
  for (let y = yFrom; y <= yTo; y++) years.push(yearModel(y));
  const cur = yearModel(year);

  // ---- Draft and trips.
  const setName = (name: string) => setDraft((d) => ({ ...d, name }));

  /** Dates picked in the form's own picker: on desktop the popover moves to the last day (on phones the sheet stays on the day tapped), and the calendar goes there if that year is not on screen. */
  const setRange = (from: string, to: string) => {
    setDraft((d) => ({ ...d, from, to }));
    setErr('');
    const k = to || from;
    if (!isMobileRef.current) setAnchorKey(k);
    if (k) {
      const y = yearOf(k);
      if (y < yFrom || y > yTo) jumpTo(y, false, Number(k.slice(5, 7)) - 1);
    }
  };

  const clearDraft = () => {
    setDraft(EMPTY_DRAFT);
    setAnchorKey('');
    setErr('');
  };

  const tapDay = useCallback((key: string) => {
    setErr('');
    setAnchorKey(key);
    const trip = ownRef.current[key];
    setDraft((d) => {
      // A day of a trip opens that trip, with Change and Remove, unless a pick is half way on desktop (the day is then
      // the last one) or the trip is the one being changed (its old days are picked like any other day).
      const halfWay = !!d.from && !d.to && !isMobileRef.current;
      if (trip && trip.id !== d.id && !halfWay) return EMPTY_DRAFT;
      // On phones there is no second click: the sheet opens with the day as the first day, and the last day is picked in it.
      if (isMobileRef.current || !d.from || d.to) return { ...d, from: key, to: '' };
      if (key < d.from) return { ...d, from: key, to: d.from };
      return { ...d, to: key };
    });
  }, []);
  /** The day the form sits on, for the line that says what a day of leave there is worth. */
  const tapped: DayCell | null = anchorKey ? (yearModel(yearOf(anchorKey)).months[Number(anchorKey.slice(5, 7)) - 1].cells.find((c) => c?.key === anchorKey) ?? null) : null;
  /** The trip the popover shows, when the day clicked is in one and nothing is being picked: Change or Remove. */
  const shownTrip: Trip | null = (anchorKey && !draft.from && own[anchorKey]) || null;

  /** Change: the form opens on the trip's days and name; the calendar draws them as the draft from here on. */
  const editTrip = () => {
    if (!shownTrip) return;
    setDraft({ id: shownTrip.id, name: shownTrip.name, from: shownTrip.from, to: shownTrip.to });
    setErr('');
  };

  // A trip removed from the sidebar while its form is open takes the form with it.
  useEffect(() => {
    if (draft.id && !trips.some((t) => t.id === draft.id)) {
      setDraft(EMPTY_DRAFT);
      setAnchorKey('');
      setErr('');
    }
  }, [trips, draft.id]);

  /** Add, or Save when the draft is changing a trip: the same checks, then a new trip or the old one on its new days. */
  const addTrip = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const [a, b] = draftRange(draft.from, draft.to);
    if (!a) return;
    if (daysBetween(a, b) > 365) {
      setErr('Keep a trip under a year long.');
      return;
    }
    const days: string[] = [];
    eachDay(a, b, (k) => days.push(k));
    const clash = days.map((k) => own[k]).find((t) => t && t.id !== draft.id);
    if (clash) {
      setErr(`Those dates overlap “${clash.name}”. Pick other days.`);
      return;
    }
    const before = trips.find((t) => t.id === draft.id);
    if (before) {
      const after: Trip = { ...before, name: draft.name.trim() || before.name, from: a, to: b };
      setTrips((ts) => ts.map((t) => (t.id === before.id ? after : t)));
      toast(`Changed “${after.name}”`, {
        action: { label: 'Undo', onClick: () => setTrips((ts) => ts.map((t) => (t.id === before.id ? before : t))) },
      });
    } else {
      const trip: Trip = {
        id: 't' + Date.now().toString(36),
        name: draft.name.trim() || `Trip ${trips.length + 1}`,
        from: a,
        to: b,
        color: PALETTE[trips.length % PALETTE.length],
      };
      setTrips([...trips, trip]);
    }
    setDraft(EMPTY_DRAFT);
    setAnchorKey('');
    setErr('');
    const ty = yearOf(a);
    if (ty !== year) jumpTo(ty, true);
  };

  /** The names of the public holidays from a to b, each once. */
  const holidayNamesIn = (a: string, b: string): string[] => {
    const names: string[] = [];
    if (settings.holidays) {
      eachDay(a, b, (k) => {
        for (const n of (lookup(yearOf(k))[k] || '').split(' · ')) if (n && !names.includes(n)) names.push(n);
      });
    }
    return names;
  };


  /** Adds suggested breaks as trips, each over its whole break so that it shows as one band; a break that now clashes is skipped. */
  const addBreaks = (breaks: NewBreak[]) => {
    const taken = { ...own };
    const added: Trip[] = [];
    const kept: NewBreak[] = [];
    const stamp = Date.now().toString(36);
    for (const b of breaks) {
      const days: string[] = [];
      let clash = false;
      eachDay(b.from, b.to, (k) => {
        days.push(k);
        if (taken[k]) clash = true;
      });
      if (clash) continue;
      const trip: Trip = {
        id: `t${stamp}${added.length ? `-${added.length}` : ''}`,
        name: b.name,
        from: b.from,
        to: b.to,
        color: PALETTE[(trips.length + added.length) % PALETTE.length],
      };
      for (const k of days) taken[k] = trip;
      added.push(trip);
      kept.push(b);
    }
    if (added.length === 0) {
      toast('Those days are already planned.');
      return;
    }
    setTrips([...trips, ...added]);
    const ids = new Set(added.map((t) => t.id));
    const off = kept.reduce((n, b) => n + b.off, 0);
    const leave = kept.reduce((n, b) => n + b.leave, 0);
    toast(added.length === 1 ? `Added “${added[0].name}”` : `Added ${plural(added.length, 'break')}`, {
      description: `${plural(off, 'day')} off for ${plural(leave, 'day')} of leave`,
      action: { label: 'Undo', onClick: () => setTrips((ts) => ts.filter((t) => !ids.has(t.id))) },
    });
  };

  const removeTrip = (id: string) => {
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;
    setTrips((ts) => ts.filter((t) => t.id !== id));
    toast(`Removed “${trip.name}”`, {
      action: {
        label: 'Undo',
        onClick: () => setTrips((ts) => (ts.some((t) => t.id === trip.id) ? ts : [...ts, trip])),
      },
    });
  };

  // ---- Settings.
  const patchSettings = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  // ---- The draft, or the trip shown, as the popover words it: the dates, and what they cost, naming the public holidays inside.
  const [ra, rb] = pa ? [pa, pb] : shownTrip ? [shownTrip.from, shownTrip.to] : ['', ''];
  const rangeText = ra ? `${fmt(ra, year)}${rb !== ra ? ` – ${fmt(rb, year)}` : ''}` : '';
  let summary = '';
  if (ra) {
    const c = count(ra, rb, settings, lookup);
    const names = holidayNamesIn(ra, rb);
    summary = `${plural(c.all, 'day')} · ${c.off} off work`;
    if (names.length) summary += ` · includes ${names.length <= 2 ? names.join(' and ') : `${names[0]} and ${names.length - 1} more`}`;
  }

  const yA = `${year}-01-01`;
  const yB = `${year}-12-31`;
  const inYear = [...trips]
    .sort((p, q) => (p.from < q.from ? -1 : p.from > q.from ? 1 : 0))
    .filter((t) => t.from <= yB && t.to >= yA);
  const rows: TripRow[] = inYear.map((t) => {
    const n = cur.offBy[t.id] || 0;
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      from: t.from,
      range: fmt(t.from, year) + (t.to !== t.from ? ` – ${fmt(t.to, year)}` : ''),
      off: `${n} ${n === 1 ? 'day' : 'days'}`,
    };
  });
  const total = Math.max(settings.allowance, cur.used) || 1;
  const segments: Segment[] = inYear
    .filter((t) => cur.offBy[t.id])
    .map((t) => ({ width: `${((cur.offBy[t.id] / total) * 100).toFixed(2)}%`, color: t.color }));

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider style={SIDEBAR_STYLE}>
        <AppSidebar
          year={year}
          allowance={settings.allowance}
          used={cur.used}
          holidaysOn={settings.holidays}
          segments={segments}
          trips={rows}
          onRemove={removeTrip}
          onJump={(from) => jumpTo(yearOf(from), true)}
        />
        <SidebarInset className="h-svh overflow-hidden md:h-[calc(100svh-1rem)]">
          <AppHeader
            year={year}
            showToday={!atToday}
            holidaysOn={settings.holidays}
            view={settings.view}
            onViewChange={(view) => patchSettings({ view })}
            onPrev={() => jumpTo(year - 1, true)}
            onNext={() => jumpTo(year + 1, true)}
            onToday={goToday}
          >
            <SettingsButton ref={settingsButtonRef} open={isMobile ? settingsMobile : settingsOpen} onClick={toggleSettings} />
          </AppHeader>
          <YearCalendar years={years} view={settings.view} scrollerRef={scroller.ref} onScroll={scroller.onScroll} onTapDay={tapDay} onOpenInsights={openInsights} />
          <TripPopover
            draft={draft}
            trip={shownTrip}
            anchorKey={anchorKey}
            scrollerRef={scroller.ref}
            mountedYears={`${yFrom}-${yTo}`}
            tapped={tapped}
            rangeText={rangeText}
            summary={summary}
            error={err}
            yearInView={year}
            minYear={MIN_YEAR}
            maxYear={MAX_YEAR}
            weekStart={settings.weekStart}
            isMobile={isMobile}
            onNameChange={setName}
            onRangeChange={setRange}
            onClear={clearDraft}
            onAdd={addTrip}
            onEdit={editTrip}
            onRemove={() => {
              if (shownTrip) removeTrip(shownTrip.id);
              clearDraft();
            }}
          />
        </SidebarInset>
        <SettingsPanel
          isMobile={isMobile}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          openMobile={settingsMobile}
          onOpenMobileChange={setSettingsMobile}
          triggerRef={settingsButtonRef}
          settings={settings}
          year={year}
          countries={holidayStore.countries()}
          regions={holidayStore.regions(settings.country)}
          holidayCount={countHolidays(lookup(year))}
          status={holidayStore.status()}
          onRetry={() => holidayStore.retry()}
          onChange={patchSettings}
        />
        {insightsMounted && (
          <Suspense fallback={null}>
            <InsightsDialog
              open={insightsOpen}
              onOpenChange={setInsightsOpen}
              model={yearModel(insightsYear)}
              ctx={ctx}
              allowance={settings.allowance}
              holidaysOn={settings.holidays}
              status={holidayStore.status()}
              today={TODAY_KEY}
              weekStart={settings.weekStart}
              onAdd={addBreaks}
              onJumpMonth={(m) => jumpTo(insightsYear, true, m)}
            />
          </Suspense>
        )}
      </SidebarProvider>
    </TooltipProvider>
  );
}
