import { DAY_SHORT, MONTH_NAMES, eachDay, iso, isWeekend, yearOf } from './dates';
import { EMPTY_LOOKUP, type HolidayLookup } from './holidays';
import { hexA, tone } from './palette';
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

export interface DayCell {
  n: number;
  key: string;
  bg: string;
  cbg: string;
  fg: string;
  weight: 400 | 600;
  radius: string;
  dot: string | null;
  title: string;
  aria: string;
}

export interface MonthModel {
  name: string;
  label: string;
  /** null = blank cell before the 1st */
  cells: (DayCell | null)[];
  off: string;
}

export interface YearModel {
  y: number;
  label: string;
  summary: string;
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
  accent: string;
  accentTint: string;
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
  accent: string,
  lookup: HolidayLookup = EMPTY_LOOKUP,
): BuildContext {
  const own = Array.isArray(trips) ? ownMap(trips) : trips;
  const [pa, pb] = draftRange(dFrom, dTo);
  const prev: Record<string, true> = {};
  if (pa) eachDay(pa, pb, (k) => { prev[k] = true; });
  return {
    own,
    prev,
    settings,
    lookup,
    sunFirst: settings.weekStart === 'Sunday',
    accent,
    accentTint: hexA(accent, 0.12),
    pa,
    pb,
    dFrom,
    dTo,
  };
}

interface DayInfo {
  d: number;
  key: string;
  g: number;
  we: boolean;
  hol: string;
  t: Trip | undefined;
  pv: boolean;
  kind: string;
  col: number;
}

const WEEKDAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAYS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function buildYear(y: number, ctx: BuildContext): YearModel {
  const S = ctx.settings;
  const H = S.holidays ? ctx.lookup(y) : {};
  const offBy: Record<string, number> = {};
  let used = 0;
  let holWk = 0;

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
      const kind = t ? `t:${t.id}` : pv ? 'p' : hol ? 'h' : we ? 'w' : '';
      info.push({ d, key, g, we, hol, t, pv, kind, col: (lead + d - 1) % 7 });
    }

    const cells: (DayCell | null)[] = [];
    for (let k = 0; k < lead; k++) cells.push(null);
    let mOff = 0;

    info.forEach((c, ix) => {
      const free = c.we || !!c.hol;
      if (c.hol && !c.we) holWk++;
      if (c.t && !free) {
        mOff++;
        used++;
        offBy[c.t.id] = (offBy[c.t.id] || 0) + 1;
      }
      // Join bands of the same kind across the row (never across the week edge).
      const jl = !!c.kind && c.col !== 0 && ix > 0 && info[ix - 1].kind === c.kind;
      const jr = !!c.kind && c.col !== 6 && ix < info.length - 1 && info[ix + 1].kind === c.kind;
      const r = (j: boolean) => (j ? '0' : '16px');

      let bg = 'transparent';
      let cbg = 'transparent';
      let fg = '#1D1D1F';
      let weight: 400 | 600 = 400;
      let dot: string | null = null;

      if (c.t) {
        const tn = tone(c.t.color);
        const end = c.key === c.t.from || c.key === c.t.to;
        bg = tn.tint;
        cbg = end ? c.t.color : 'transparent';
        fg = end ? '#FFFFFF' : tn.ink;
        weight = 600;
        if (c.hol) dot = end ? '#FFFFFF' : tn.ink;
        // A trip day that is the draft's first click, before a second click.
        if (ctx.dFrom && !ctx.dTo && c.key === ctx.dFrom) {
          cbg = '#1D1D1F';
          fg = '#FFFFFF';
          dot = null;
        }
      } else if (c.pv) {
        const end = c.key === ctx.pa || c.key === ctx.pb;
        bg = ctx.accentTint;
        cbg = end ? ctx.accent : 'transparent';
        fg = end ? '#FFFFFF' : '#1D1D1F';
        weight = 600;
        if (c.hol) dot = end ? '#FFFFFF' : '#B80014';
      } else if (c.hol) {
        bg = 'rgba(255, 59, 48, 0.12)';
        fg = '#B80014';
        weight = 600;
      } else if (c.we) {
        bg = 'rgba(118, 118, 128, 0.10)';
        fg = '#636366';
      }

      cells.push({
        n: c.d,
        key: c.key,
        bg,
        cbg,
        fg,
        weight,
        dot,
        radius: `${r(jl)} ${r(jr)} ${r(jr)} ${r(jl)}`,
        title: c.hol,
        aria: `${DAY_SHORT[c.g]} ${c.d} ${name}${c.hol ? `, ${c.hol}` : ''}${c.t ? `, ${c.t.name}` : ''}`,
      });
    });

    return {
      name,
      label: `${name} ${y}`,
      cells,
      off: mOff ? `${mOff} ${mOff === 1 ? 'day' : 'days'} off` : '',
    };
  });

  let summary = `${used} of ${S.allowance} days off planned`;
  if (S.holidays) summary += ` · ${holWk} ${holWk === 1 ? 'holiday' : 'holidays'} on weekdays`;

  return {
    y,
    label: `Year ${y}`,
    summary,
    weekdays: ctx.sunFirst ? WEEKDAYS_SUN : WEEKDAYS_MON,
    months,
    used,
    offBy,
  };
}
