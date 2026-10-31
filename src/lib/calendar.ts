import { DAY, DAY_SHORT, MONTH_NAMES, eachDay, iso, isWeekend, isoMs, ms, yearOf } from './dates';
import { EMPTY_LOOKUP, type HolidayLookup, type OtherCountry, type OtherHoliday } from './holidays';
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

/** Why a day is free: a weekend (a holiday falling on one adds nothing), a public holiday on a weekday, or not free at all. */
export type FreeDay = false | 'weekend' | 'holiday';
export type FreeFn = (key: string) => FreeDay;

export function freeOf(key: string, settings: Settings, lookup: HolidayLookup): FreeDay {
  if (isWeekend(key)) return 'weekend';
  if (settings.holidays && lookup(yearOf(key))[key]) return 'holiday';
  return false;
}

export const freeFn = (settings: Settings, lookup: HolidayLookup): FreeFn => (k) => freeOf(k, settings, lookup);

/** Working days one block of leave may hold: a working week. Longer blocks only dilute the value. */
export const MAX_LEAVE = 5;
const WALK_CAP = 60; // days scanned per side; MAX_LEAVE working days plus the free days between them is far shorter
/** Days either side of a year whose blocks may reach into it: MAX_LEAVE working days with holidays between span a few weeks at most. */
const HEAT_MARGIN = 28;

/** A block of leave through a day: its working days plus every free day inside it and touching either end. */
export interface Block {
  /** Days off in a row it buys. */
  off: number;
  /** Working days it costs, the day included. */
  leave: number;
  /** Its first and last working day. */
  from: string;
  to: string;
  /** The first and last day of the break it buys: the free days beyond from and to included. */
  start: string;
  end: string;
}

interface Side {
  /** Offsets (days away, from 1) of the nearest MAX_LEAVE working days; one past the cap stands in for a missing one. */
  work: number[];
  /** Offset of the nearest weekday public holiday, Infinity when none lies within reach. */
  holiday: number;
}

function walk(key: string, dir: -1 | 1, free: FreeFn): Side {
  const work: number[] = [];
  let holiday = Infinity;
  const t = ms(key);
  for (let n = 1; n <= WALK_CAP && work.length < MAX_LEAVE; n++) {
    const f = free(isoMs(t + dir * n * DAY));
    if (!f) work.push(n);
    else if (f === 'holiday' && holiday === Infinity) holiday = n;
  }
  while (work.length < MAX_LEAVE) work.push(WALK_CAP + 1);
  return { work, holiday };
}

/**
 * The best block of leave through this day: of every run of up to MAX_LEAVE working days that includes it
 * and whose break takes in a public holiday, the one with the most days off per day of leave, and the
 * longest break among equals. So the Thursday before a Friday holiday is 4 for 1, and a plain day wedged
 * between two such days joins them into one long break instead of scoring nothing; a regular Friday buys
 * 3 for 1 but captures no holiday, so with nothing else around it has no block. null for a day that is
 * already free. Trips are left out on purpose: the block describes the calendar, not the plan.
 */
export function bestBlock(key: string, free: FreeFn): Block | null {
  if (free(key)) return null;
  const { work: left, holiday: holLeft } = walk(key, -1, free);
  const { work: right, holiday: holRight } = walk(key, 1, free);
  const t = ms(key);
  let best: Block | null = null;
  for (let i = 0; i < MAX_LEAVE; i++) {
    for (let j = 0; i + j < MAX_LEAVE; j++) {
      // i working days taken on the left and j on the right; the break runs over the free days beyond them.
      if (holLeft > left[i] - 1 && holRight > right[j] - 1) continue; // no holiday inside the break
      const off = left[i] + right[j] - 1;
      const leave = 1 + i + j;
      const better = !best || off * best.leave > best.off * leave || (off * best.leave === best.off * leave && off > best.off);
      if (better) {
        best = {
          off,
          leave,
          from: i ? isoMs(t - left[i - 1] * DAY) : key,
          to: j ? isoMs(t + right[j - 1] * DAY) : key,
          start: isoMs(t - (left[i] - 1) * DAY),
          end: isoMs(t + (right[j] - 1) * DAY),
        };
      }
    }
  }
  return best;
}

/** The value of a day: days off per day of leave of its best block (see bestBlock). 0 for a free day. */
export function valueOf(key: string, settings: Settings, lookup: HolidayLookup): number {
  const b = bestBlock(key, freeFn(settings, lookup));
  return b ? b.off / b.leave : 0;
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
  /** PROTOTYPE: the other countries (Settings.others) off on this day, in their order; [] when none or with holidays off. */
  others: OtherHoliday[];
  /** Days off per day of leave of the best block through this day (see bestBlock); 0 on a free day. Shades the heat map. */
  value: number;
  /** That block, for the tooltip; null on a free day. */
  best: Block | null;
  /** The value of the strongest break covering this day: its own on a working day, so that a weekend or holiday inside a break takes its heat. */
  heat: number;
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
  /** The trip the draft is changing, or '': its band gives way to the draft's, though its days still count as planned. */
  editId: string;
  /** PROTOTYPE: the other countries whose holidays the cells note (DayCell.others); they never change what a day costs. */
  others: OtherCountry[];
}

export function buildContext(
  trips: Trip[] | OwnMap,
  dFrom: string,
  dTo: string,
  settings: Settings,
  lookup: HolidayLookup = EMPTY_LOOKUP,
  editId = '',
  others: OtherCountry[] = [],
): BuildContext {
  const own = Array.isArray(trips) ? ownMap(trips) : trips;
  const [pa, pb] = draftRange(dFrom, dTo);
  const prev: Record<string, true> = {};
  if (pa) eachDay(pa, pb, (k) => { prev[k] = true; });
  return { own, prev, settings, lookup, sunFirst: settings.weekStart === 'Sunday', pa, pb, dFrom, dTo, editId, others };
}

interface DayInfo {
  d: number;
  key: string;
  g: number;
  we: boolean;
  hol: string;
  /** The trip drawn on the day: not the one being changed, whose days are drawn as the draft or as free days. */
  t: Trip | undefined;
  /** The trip whose cost the day counts towards, the one being changed included. */
  cost: Trip | undefined;
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
  const O = S.holidays ? ctx.others.map((o) => ({ ...o, map: o.lookup(y) })) : [];
  const offBy: Record<string, number> = {};
  let used = 0;
  // Free-day lookups are memoised: every working day's best block scans a few weeks either side.
  const freeCache = new Map<string, FreeDay>();
  const freeDay: FreeFn = (k) => {
    let v = freeCache.get(k);
    if (v === undefined) {
      v = freeOf(k, S, ctx.lookup);
      freeCache.set(k, v);
    }
    return v;
  };
  // Every day's best block, for the year and the weeks either side so that breaks crossing the year edge
  // count. Heat then reaches every day inside a break: a weekend or holiday takes the strongest block
  // covering it, so the whole length of a vacation shows as one band.
  const blocks = new Map<string, Block | null>();
  const heat = new Map<string, number>();
  const t1 = Date.UTC(y, 11, 31) + HEAT_MARGIN * DAY;
  for (let t = Date.UTC(y, 0, 1) - HEAT_MARGIN * DAY; t <= t1; t += DAY) {
    const k = isoMs(t);
    const b = bestBlock(k, freeDay);
    blocks.set(k, b);
    if (!b) continue;
    const v = b.off / b.leave;
    for (let u = ms(b.start), end = ms(b.end); u <= end; u += DAY) {
      const d = isoMs(u);
      if ((heat.get(d) ?? 0) < v) heat.set(d, v);
    }
  }

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
      const cost = ctx.own[key];
      const t = cost && cost.id !== ctx.editId ? cost : undefined;
      const pv = !t && !!ctx.prev[key];
      const band = t ? `t:${t.id}` : pv ? 'p' : hol ? 'h' : we ? 'w' : '';
      info.push({ d, key, g, we, hol, t, cost, pv, band, col: (lead + d - 1) % 7 });
    }

    const cells: (DayCell | null)[] = [];
    for (let k = 0; k < lead; k++) cells.push(null);
    let off = 0;

    info.forEach((c, ix) => {
      const free = c.we || !!c.hol;
      // The trip being changed keeps its saved cost until it is saved again, so the totals do not jump while picking.
      if (c.cost && !free) {
        off++;
        used++;
        offBy[c.cost.id] = (offBy[c.cost.id] || 0) + 1;
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

      const best = blocks.get(c.key) ?? null;
      const others: OtherHoliday[] = [];
      for (const o of O) if (o.map[c.key]) others.push({ code: o.code, name: o.name, holiday: o.map[c.key] });
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
        others,
        value: best ? best.off / best.leave : 0,
        best,
        heat: heat.get(c.key) ?? 0,
        aria: `${DAY_SHORT[c.g]} ${c.d} ${name}${c.hol ? `, ${c.hol}` : ''}${others.map((o) => `, ${o.holiday} in ${o.name}`).join('')}${c.t ? `, ${c.t.name}` : ''}`,
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
