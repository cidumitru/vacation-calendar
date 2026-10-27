import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type UIEvent } from 'react';
import { Calendar } from './components/Calendar';
import { SettingsPopover } from './components/SettingsPopover';
import { Sidebar, type HintKind, type Segment, type TripRow } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { buildContext, buildYear, count, draftRange, ownMap, type YearModel } from './lib/calendar';
import { daysBetween, eachDay, fmt, yearOf } from './lib/dates';
import { holidayNote } from './lib/holidays';
import { ACCENT, PALETTE, accentText, hexA } from './lib/palette';
import { load, save } from './lib/storage';
import type { Draft, Settings, Trip } from './lib/types';

const START_YEAR = 2026;
const MIN_YEAR = 1950;
const MAX_YEAR = 2099;
const EDGE = 500; // px from either end of the scroller that loads another year
const EMPTY_DRAFT: Draft = { name: '', from: '', to: '' };

const reduceMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function App() {
  const [initial] = useState(load);
  const [trips, setTrips] = useState<Trip[]>(initial.trips);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [err, setErr] = useState('');
  const [year, setYear] = useState(START_YEAR);
  const [yFrom, setYFrom] = useState(START_YEAR - 1);
  const [yTo, setYTo] = useState(START_YEAR + 1);
  const [showSettings, setShowSettings] = useState(false);

  // ---- Persistence: write after every change to trips or settings (not on first load).
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    save({ trips, settings });
  }, [trips, settings]);

  // ---- Year models, cached until trips, the draft, settings or the accent change.
  const own = useMemo(() => ownMap(trips), [trips]);
  const ctx = useMemo(() => buildContext(own, draft.from, draft.to, settings, ACCENT), [own, draft.from, draft.to, settings]);
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

  // ---- Scrolling: endless years, anchored prepends, year-in-view sync, stepper jumps.
  const scRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const jumpingRef = useRef(false);
  const jumpTimer = useRef<number | undefined>(undefined);
  const anchorRef = useRef<{ h: number; t: number } | null>(null);
  const jumpRef = useRef<{ y: number; smooth: boolean } | null>(null);
  const initTopRef = useRef<number | null>(null);

  const setJumping = (ms: number) => {
    jumpingRef.current = true;
    window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => {
      jumpingRef.current = false;
    }, ms);
  };

  useLayoutEffect(() => {
    const el = scRef.current;
    if (!el) return;
    const go = () => {
      const sec = el.querySelector<HTMLElement>(`[data-year="${START_YEAR}"]`);
      if (!sec) return;
      setJumping(300);
      el.scrollTop = sec.offsetTop;
      initTopRef.current = el.scrollTop;
    };
    go();
    let cancelled = false;
    try {
      // Re-apply once webfonts load, unless the person has already scrolled.
      document.fonts?.ready.then(() => {
        if (!cancelled && initTopRef.current != null && el.scrollTop === initTopRef.current) go();
      });
    } catch {
      /* no Font Loading API */
    }
    return () => {
      cancelled = true;
      window.clearTimeout(jumpTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = scRef.current;
    if (!el) return;
    if (anchorRef.current) {
      // A year was prepended: keep the view still.
      el.scrollTop = anchorRef.current.t + (el.scrollHeight - anchorRef.current.h);
      anchorRef.current = null;
    }
    busyRef.current = false;
    if (jumpRef.current) {
      const sec = el.querySelector<HTMLElement>(`[data-year="${jumpRef.current.y}"]`);
      if (sec) {
        const behavior = jumpRef.current.smooth && !reduceMotion() ? 'smooth' : 'auto';
        try {
          el.scrollTo({ top: sec.offsetTop, behavior });
        } catch {
          el.scrollTop = sec.offsetTop;
        }
      }
      jumpRef.current = null;
    }
  });

  const syncActive = (el: HTMLDivElement) => {
    if (jumpingRef.current) return;
    const secs = el.querySelectorAll<HTMLElement>('[data-year]');
    const line = el.getBoundingClientRect().top + Math.min(160, el.clientHeight * 0.3);
    let act: number | null = null;
    secs.forEach((s) => {
      if (s.getBoundingClientRect().top <= line) act = Number(s.dataset.year);
    });
    if (act == null && secs.length) act = Number(secs[0].dataset.year);
    if (act != null && act !== year) setYear(act);
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    syncActive(el);
    if (busyRef.current || jumpingRef.current) return;
    if (el.scrollTop < EDGE && yFrom > MIN_YEAR) {
      busyRef.current = true;
      anchorRef.current = { h: el.scrollHeight, t: el.scrollTop };
      setYFrom(yFrom - 1);
    } else if (el.scrollTop + el.clientHeight > el.scrollHeight - EDGE && yTo < MAX_YEAR) {
      busyRef.current = true;
      setYTo(yTo + 1);
    }
  };

  const jumpTo = (y: number, smooth: boolean) => {
    if (y < MIN_YEAR || y > MAX_YEAR) return;
    let prepended = false;
    if (y - 1 < yFrom) {
      setYFrom(Math.max(MIN_YEAR, y - 1));
      prepended = true;
    }
    if (y + 1 > yTo) setYTo(Math.min(MAX_YEAR, y + 1));
    setYear(y);
    jumpRef.current = { y, smooth: smooth && !prepended };
    setJumping(900);
  };

  // ---- Draft and trips.
  const onDraftChange = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (patch.from !== undefined || patch.to !== undefined) setErr('');
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

  const removeTrip = (id: string) => setTrips((ts) => ts.filter((t) => t.id !== id));

  // ---- Settings.
  const patchSettings = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const closeSettings = useCallback(() => {
    setShowSettings(false);
    settingsButtonRef.current?.focus();
  }, []);
  const toggleSettings = () => setShowSettings((v) => !v);

  // ---- Derived view values for the year in view.
  const [pa, pb] = draftRange(draft.from, draft.to);
  let hint = 'Or click a first and a last day in the calendar.';
  let hintKind: HintKind = 'default';
  if (err) {
    hint = err;
    hintKind = 'error';
  } else if (pa) {
    const c = count(pa, pb, settings);
    hint = `${fmt(pa, year)}${pb !== pa ? ` → ${fmt(pb, year)}` : ''} · ${c.all} ${c.all === 1 ? 'day' : 'days'}, ${c.off} off work`;
    hintKind = 'draft';
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
      range: fmt(t.from, year) + (t.to !== t.from ? ` – ${fmt(t.to, year)}` : ''),
      off: `${n} ${n === 1 ? 'day' : 'days'}`,
    };
  });
  const total = Math.max(settings.allowance, cur.used) || 1;
  const segments: Segment[] = inYear
    .filter((t) => cur.offBy[t.id])
    .map((t) => ({ width: `${((cur.offBy[t.id] / total) * 100).toFixed(2)}%`, color: t.color }));

  const accentVars = {
    '--accent': ACCENT,
    '--accent-text': accentText(ACCENT),
    '--preview-band': hexA(ACCENT, 0.12),
  } as CSSProperties;

  return (
    <div className="app" style={accentVars}>
      <Sidebar
        year={year}
        allowance={settings.allowance}
        used={cur.used}
        holidaysOn={settings.holidays}
        segments={segments}
        draft={draft}
        onDraftChange={onDraftChange}
        onClear={clearDraft}
        onAdd={addTrip}
        hint={hint}
        hintKind={hintKind}
        trips={rows}
        onRemove={removeTrip}
      />
      <main className="main">
        <Toolbar
          year={year}
          onPrev={() => jumpTo(year - 1, true)}
          onNext={() => jumpTo(year + 1, true)}
          holidaysOn={settings.holidays}
          settingsOpen={showSettings}
          onToggleSettings={toggleSettings}
          settingsButtonRef={settingsButtonRef}
        />
        <Calendar ref={scRef} years={years} onScroll={onScroll} onTapDay={tapDay} />
        {showSettings && (
          <SettingsPopover
            settings={settings}
            note={holidayNote(settings.country, year, settings.holidays)}
            onChange={patchSettings}
            onClose={closeSettings}
          />
        )}
      </main>
    </div>
  );
}
