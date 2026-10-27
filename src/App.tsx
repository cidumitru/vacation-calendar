import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/app-header';
import { AppSidebar, type HintKind, type Segment, type TripRow } from '@/components/app-sidebar';
import { SettingsPopover } from '@/components/settings-popover';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { YearCalendar } from '@/components/year-calendar';
import { useYearScroller } from '@/hooks/use-year-scroller';
import { buildContext, buildYear, count, draftRange, ownMap, type YearModel } from '@/lib/calendar';
import { daysBetween, eachDay, fmt, yearOf } from '@/lib/dates';
import { countHolidays, regionsOf, toHolidayMap, type HolidayLookup, type HolidayMap } from '@/lib/holidays';
import { holidayStore } from '@/lib/holidayStore';
import { PALETTE } from '@/lib/palette';
import { load, save } from '@/lib/storage';
import type { Draft, Settings, Trip } from '@/lib/types';

const MIN_YEAR = 1950;
const MAX_YEAR = 2099;
const THIS_YEAR = Math.min(MAX_YEAR, Math.max(MIN_YEAR, new Date().getFullYear()));
const EMPTY_DRAFT: Draft = { name: '', from: '', to: '' };
const SIDEBAR_STYLE = { '--sidebar-width': '18rem' } as CSSProperties;

export function App() {
  const [initial] = useState(() => load());
  const [trips, setTrips] = useState<Trip[]>(initial.trips);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [err, setErr] = useState('');
  const scroller = useYearScroller(THIS_YEAR, MIN_YEAR, MAX_YEAR);
  const { year, yFrom, yTo, jumpTo } = scroller;

  // ---- Persistence: write after every change to trips or settings (not on first load).
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    save({ trips, settings });
  }, [trips, settings]);

  // ---- Public holidays from Nager.Date, through the cached store.
  const holidayVersion = useSyncExternalStore(holidayStore.subscribe, holidayStore.getVersion);
  const [pa, pb] = draftRange(draft.from, draft.to);
  useEffect(() => {
    if (!settings.holidays) return;
    holidayStore.ensureCountries();
    const years = new Set<number>();
    for (let y = yFrom; y <= yTo; y++) years.add(y);
    if (pa) {
      years.add(yearOf(pa));
      years.add(yearOf(pb));
    }
    for (const y of years) if (y >= MIN_YEAR && y <= MAX_YEAR) holidayStore.ensure(settings.country, y);
  }, [settings.holidays, settings.country, yFrom, yTo, pa, pb]);

  const lookup = useMemo<HolidayLookup>(() => {
    const maps = new Map<number, HolidayMap>();
    return (y: number) => {
      let m = maps.get(y);
      if (!m) {
        m = settings.holidays ? toHolidayMap(holidayStore.get(settings.country, y) ?? [], settings.region, y) : {};
        maps.set(y, m);
      }
      return m;
    };
    // holidayVersion changes whenever the store receives data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.holidays, settings.country, settings.region, holidayVersion]);

  // ---- Year models, cached until trips, the draft, settings or holiday data change.
  const own = useMemo(() => ownMap(trips), [trips]);
  const ctx = useMemo(() => buildContext(own, draft.from, draft.to, settings, lookup), [own, draft.from, draft.to, settings, lookup]);
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

  const setRange = (from: string, to: string) => {
    setDraft((d) => ({ ...d, from, to }));
    setErr('');
  };

  const clearDraft = () => {
    setDraft(EMPTY_DRAFT);
    setErr('');
  };

  const tapDay = useCallback((key: string) => {
    setErr('');
    setDraft((d) => {
      if (!d.from || d.to) return { ...d, from: key, to: '' };
      if (key < d.from) return { ...d, from: key, to: d.from };
      return { ...d, to: key };
    });
  }, []);

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
    const clash = days.map((k) => own[k]).find(Boolean);
    if (clash) {
      setErr(`Those dates overlap “${clash.name}”. Pick other days.`);
      return;
    }
    const trip: Trip = {
      id: 't' + Date.now().toString(36),
      name: draft.name.trim() || `Trip ${trips.length + 1}`,
      from: a,
      to: b,
      color: PALETTE[trips.length % PALETTE.length],
    };
    setTrips([...trips, trip]);
    setDraft(EMPTY_DRAFT);
    setErr('');
    const ty = yearOf(a);
    if (ty !== year) jumpTo(ty, true);
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

  // ---- Derived view values for the year in view.
  let hint = 'Or click a first and a last day in the calendar.';
  let hintKind: HintKind = 'default';
  if (err) {
    hint = err;
    hintKind = 'error';
  } else if (pa) {
    const c = count(pa, pb, settings, lookup);
    // A pick that lands on a public holiday says which one: "Fri 1 May (Labour Day)".
    const day = (k: string) => {
      const h = settings.holidays ? lookup(yearOf(k))[k] : '';
      return fmt(k, year) + (h ? ` (${h})` : '');
    };
    hint = `${day(pa)}${pb !== pa ? ` → ${day(pb)}` : ''} · ${c.all} ${c.all === 1 ? 'day' : 'days'}, ${c.off} off work`;
    hintKind = 'draft';
  }
  const dateText = pa ? `${fmt(pa, year)}${pb !== pa ? ` – ${fmt(pb, year)}` : ''}` : 'Pick dates';

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
          minYear={MIN_YEAR}
          maxYear={MAX_YEAR}
          allowance={settings.allowance}
          used={cur.used}
          holidaysOn={settings.holidays}
          weekStart={settings.weekStart}
          segments={segments}
          draft={draft}
          dateText={dateText}
          onNameChange={setName}
          onRangeChange={setRange}
          onClear={clearDraft}
          onAdd={addTrip}
          hint={hint}
          hintKind={hintKind}
          trips={rows}
          onRemove={removeTrip}
          onJump={(from) => jumpTo(yearOf(from), true)}
        />
        <SidebarInset className="h-svh overflow-hidden md:h-[calc(100svh-1rem)]">
          <AppHeader
            year={year}
            thisYear={THIS_YEAR}
            holidaysOn={settings.holidays}
            onPrev={() => jumpTo(year - 1, true)}
            onNext={() => jumpTo(year + 1, true)}
            onToday={() => jumpTo(THIS_YEAR, true)}
          >
            <SettingsPopover
              settings={settings}
              year={year}
              countries={holidayStore.getCountries()}
              countriesStatus={holidayStore.countriesStatus()}
              regions={regionsOf(holidayStore.get(settings.country, year) ?? [])}
              holidayCount={countHolidays(lookup(year))}
              status={holidayStore.status(settings.country, year)}
              onRetry={() => {
                holidayStore.retry(settings.country, year);
                holidayStore.retryCountries();
              }}
              onChange={patchSettings}
            />
          </AppHeader>
          <YearCalendar years={years} scrollerRef={scroller.ref} onScroll={scroller.onScroll} onTapDay={tapDay} />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
