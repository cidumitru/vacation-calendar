import { DAY_SHORT, MONTH_NAMES, eachDay, iso, isWeekend, yearOf } from './dates';
import { EMPTY_LOOKUP, type HolidayLookup } from './holidays';
import type { Settings, Trip } from './types';

/** 'YYYY-MM-DD' → the trip that owns that day. */
export type OwnMap = Record<string, Trip>;

export function ownMap(trips: Trip[]): OwnMap {
  const own: OwnMap = {};
  for (const t of trips) eachDay(t.from, t.to, (k) => { own[k] = t; });
  return own;
}

/** A day is free (costs nothing) on a weekend or, with holidays on, on a public holiday. */
export function isFree(key: string, settings: Settings, lookup: HolidayLookup): boolean {
  if (isWeekend(key)) return true;
  if (!settings.holidays) return false;
  return !!lookup(yearOf(key))[key];
}

export function count(a: string, b: string, settings: Settings, lookup: HolidayLookup): { all: number; off: number } {
  let all = 0;
  let off = 0;
  eachDay(a, b, (k) => {
    all++;
    if (!isFree(k, settings, lookup)) off++;
  });
  return { all, off };
}

/** Normalised draft range: from <= to, to defaults to from. Empty strings when no draft. */
export function draftRange(from: string, to: string): [string, string] {
  let a = from;
  let b = to || from;
  if (a && b && b < a) [a, b] = [b, a];
  return [a, b];
}

/** What a day shows, strongest claim first: a trip, the draft, a public holiday, a weekend. */
export type DayKind = 'trip' | 'draft' | 'holiday' | 'weekend' | 'plain';

export interface DayCell {
  n: number;
  key: string;
  kind: DayKind;
  /** The trip's colour when kind is 'trip'. */
  color: string | null;
  /** First or last day of its trip or draft: drawn as a solid circle. */
  end: boolean;
  /** The draft's first click landed on this trip day and waits for a second click. */
  picked: boolean;
  /** The band continues from the previous day, or on to the next, within the week row. */
  joinLeft: boolean;
  joinRight: boolean;
  holiday: string; // '' when none; shown in a tooltip and in the accessible name
  aria: string;
}

export interface MonthModel {
  name: string;
  label: string;
  /** null = blank cell before the 1st */
  cells: (DayCell | null)[];
  /** Days off work spent in this month. */
  off: number;
}

export interface YearModel {
  y: number;
  label: string;
  weekdays: string[];
  months: MonthModel[];
  used: number;
  offBy: Record<string, number>;
}

export interface BuildContext {
  own: OwnMap;
  prev: Record<string, true>;
  settings: Settings;
  lookup: HolidayLookup;
  sunFirst: boolean;
  pa: string;
  pb: string;
  dFrom: string;
  dTo: string;
}

export function buildContext(
  trips: Trip[] | OwnMap,
  dFrom: string,
  dTo: string,
  settings: Settings,
  lookup: HolidayLookup = EMPTY_LOOKUP,
): BuildContext {
  const own = Array.isArray(trips) ? ownMap(trips) : trips;
  const [pa, pb] = draftRange(dFrom, dTo);
  const prev: Record<string, true> = {};
  if (pa) eachDay(pa, pb, (k) => { prev[k] = true; });
  return { own, prev, settings, lookup, sunFirst: settings.weekStart === 'Sunday', pa, pb, dFrom, dTo };
}

interface DayInfo {
  d: number;
  key: string;
  g: number;
  we: boolean;
  hol: string;
  t: Trip | undefined;
  pv: boolean;
  /** Days with the same band key join into one pill across the week row. */
  band: string;
  col: number;
}

const WEEKDAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAYS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function buildYear(y: number, ctx: BuildContext): YearModel {
  const S = ctx.settings;
  const H = S.holidays ? ctx.lookup(y) : {};
  const offBy: Record<string, number> = {};
  let used = 0;

  const months = MONTH_NAMES.map((name, m): MonthModel => {
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const g1 = new Date(Date.UTC(y, m, 1)).getUTCDay();
    const lead = ctx.sunFirst ? g1 : (g1 + 6) % 7;
    const info: DayInfo[] = [];
    for (let d = 1; d <= dim; d++) {
      const key = iso(y, m, d);
      const g = (g1 + d - 1) % 7;
      const we = g === 0 || g === 6;
      const hol = H[key] || '';
      const t = ctx.own[key];
      const pv = !t && !!ctx.prev[key];
      const band = t ? `t:${t.id}` : pv ? 'p' : hol ? 'h' : we ? 'w' : '';
      info.push({ d, key, g, we, hol, t, pv, band, col: (lead + d - 1) % 7 });
    }

    const cells: (DayCell | null)[] = [];
    for (let k = 0; k < lead; k++) cells.push(null);
    let off = 0;

    info.forEach((c, ix) => {
      const free = c.we || !!c.hol;
      if (c.t && !free) {
        off++;
        used++;
        offBy[c.t.id] = (offBy[c.t.id] || 0) + 1;
      }
      // Join bands of the same kind across the row (never across the week edge).
      const joinLeft = !!c.band && c.col !== 0 && ix > 0 && info[ix - 1].band === c.band;
      const joinRight = !!c.band && c.col !== 6 && ix < info.length - 1 && info[ix + 1].band === c.band;

      let kind: DayKind = 'plain';
      let end = false;
      let picked = false;
      if (c.t) {
        kind = 'trip';
        end = c.key === c.t.from || c.key === c.t.to;
        picked = !!ctx.dFrom && !ctx.dTo && c.key === ctx.dFrom;
      } else if (c.pv) {
        kind = 'draft';
        end = c.key === ctx.pa || c.key === ctx.pb;
      } else if (c.hol) {
        kind = 'holiday';
      } else if (c.we) {
        kind = 'weekend';
      }

      cells.push({
        n: c.d,
        key: c.key,
        kind,
        color: c.t?.color ?? null,
        end,
        picked,
        joinLeft,
        joinRight,
        holiday: c.hol,
        aria: `${DAY_SHORT[c.g]} ${c.d} ${name}${c.hol ? `, ${c.hol}` : ''}${c.t ? `, ${c.t.name}` : ''}`,
      });
    });

    return { name, label: `${name} ${y}`, cells, off };
  });

  return {
    y,
    label: `Year ${y}`,
    weekdays: ctx.sunFirst ? WEEKDAYS_SUN : WEEKDAYS_MON,
    months,
    used,
    offBy,
  };
}
