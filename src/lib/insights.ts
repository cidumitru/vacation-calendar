// The facts of a year and the breaks worth suggesting, read off the year model (see buildYear): how its
// days split into working days, weekends and public holidays, which holidays are lost to a weekend, the
// distinct best blocks of leave (see bestBlock) gathered into the clusters they overlap in, and the most
// days off the leave still left can buy.

import type { BuildContext, YearModel } from './calendar';
import { DAY_SHORT, eachDay, ms, yearOf } from './dates';
import { breakName } from './holidays';
import type { Trip } from './types';

/** Blocks below this value are left out, as the heat map leaves them bare (see heatLevel in heat-scale). */
export const MIN_SUGGESTION_VALUE = 2.5;

/** A day of leave that buys a break this long or longer makes the day a bridge day. */
export const BRIDGE_MIN_OFF = 4;

export interface Suggestion {
  /** `${from}:${to}`: the days of leave identify a block. */
  id: string;
  /** Days off in a row the block buys. */
  off: number;
  /** Working days it costs. */
  leave: number;
  /** off / leave: days off per day of leave. */
  value: number;
  /** Its first and last day of leave. */
  from: string;
  to: string;
  /** The first and last day of the break: the free days beyond from and to included. */
  start: string;
  end: string;
  /** The public holidays inside the break, in date order, named as the calendar names them. */
  holidays: string[];
  /** A trip already covering a day of the break, when one does; such a break cannot be added again. */
  trip: Trip | null;
}

/** The suggestions around one holiday, or one run of holidays: every block in it overlaps another. */
export interface Cluster {
  id: string;
  /** The holidays inside the cluster's span, in date order; see clusterName. */
  holidays: string[];
  start: string;
  end: string;
  /** The option with the most days off per day of leave, the longest among equals. */
  best: Suggestion;
  /** Every option, the cheapest first and the longest among equals. */
  options: Suggestion[];
}

export interface HolidayFact {
  key: string;
  name: string;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

export interface FrontierPoint {
  leave: number;
  off: number;
}

export interface LeavePlan {
  /** The breaks picked, in date order: non-overlapping, the most days off within the leave, the fewest days of leave among equals. */
  picks: Suggestion[];
  leave: number;
  off: number;
  /** The most days off each number of days of leave can buy, for every count that buys more than the one before. */
  frontier: FrontierPoint[];
}

export interface YearInsights {
  year: number;
  days: number;
  weekendDays: number;
  /** Weekdays that are not public holidays. */
  workingDays: number;
  holidays: HolidayFact[];
  /** Public holidays that fall on a weekday, and so are days off work. */
  onWeekdays: HolidayFact[];
  /** Public holidays that fall on a Saturday or Sunday, and so add nothing. */
  onWeekends: HolidayFact[];
  /** Public holidays per weekday, Sunday first. */
  byWeekday: number[];
  /** Working days where a single day of leave buys a break of BRIDGE_MIN_OFF days or more. */
  bridgeDays: number;
  /** The trips that touch the year: how many, the days of them inside the year (free days included) and the leave they cost. */
  planned: { trips: number; days: number; leave: number };
  /** Days of leave left: the allowance minus the leave planned, never below zero. */
  left: number;
  /** Every distinct block worth suggesting, best value first, then the longest, then the earliest. */
  suggestions: Suggestion[];
  /** The suggestions gathered by overlap, in date order. */
  clusters: Cluster[];
  /** The suggestion with the most days off. */
  longest: Suggestion | null;
  /** The best use of the leave left among the suggestions not yet planned. */
  plan: LeavePlan;
}

const overlaps = (a: Suggestion, b: Suggestion): boolean => a.start <= b.end && b.start <= a.end;

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function byValue(a: Suggestion, b: Suggestion): number {
  if (a.value !== b.value) return b.value - a.value;
  if (a.off !== b.off) return b.off - a.off;
  return cmp(a.start, b.start);
}

const byStart = (a: Suggestion, b: Suggestion): number => cmp(a.start, b.start) || cmp(a.end, b.end);

const byLeave = (a: Suggestion, b: Suggestion): number => a.leave - b.leave || b.off - a.off || cmp(a.start, b.start);

interface Score {
  off: number;
  leave: number;
}

const better = (a: Score, b: Score): boolean => a.off > b.off || (a.off === b.off && a.leave < b.leave);

/**
 * The most days off the leave can buy from non-overlapping candidates (a knapsack over intervals), and the
 * fewest days of leave among equals, so that no day is spent for nothing. Candidates already planned are
 * left out. Also the frontier: what each smaller number of days of leave could buy.
 */
export function planLeave(candidates: Suggestion[], budget: number): LeavePlan {
  const items = candidates.filter((s) => !s.trip).sort((a, b) => cmp(a.end, b.end) || cmp(a.start, b.start));
  const n = items.length;
  // chain[i]: how many of the items, sorted by end, finish before item i starts; the row to build on when i is taken.
  const chain = items.map((s) => {
    let p = 0;
    for (let j = 0; j < n && items[j].end < s.start; j++) p = j + 1;
    return p;
  });
  // rows[i][b]: the best score using the first i items with at most b days of leave.
  const zero: Score = { off: 0, leave: 0 };
  const rows: Score[][] = [Array.from({ length: budget + 1 }, () => zero)];
  for (let i = 1; i <= n; i++) {
    const s = items[i - 1];
    const row = rows[i - 1].slice();
    for (let b = s.leave; b <= budget; b++) {
      const base = rows[chain[i - 1]][b - s.leave];
      const taken: Score = { off: base.off + s.off, leave: base.leave + s.leave };
      if (better(taken, row[b])) row[b] = taken;
    }
    rows.push(row);
  }
  const picks: Suggestion[] = [];
  for (let i = n, b = budget; i > 0; ) {
    if (rows[i][b] === rows[i - 1][b]) {
      i--;
      continue;
    }
    const s = items[i - 1];
    picks.push(s);
    b -= s.leave;
    i = chain[i - 1];
  }
  picks.sort(byStart);
  const last = rows[n][budget];
  const frontier: FrontierPoint[] = [];
  for (let b = 1; b <= budget; b++) {
    const sc = rows[n][b];
    if (sc.off > (frontier[frontier.length - 1]?.off ?? 0)) frontier.push({ leave: sc.leave, off: sc.off });
  }
  return { picks, leave: last.leave, off: last.off, frontier };
}

/** A cluster is named after the holidays inside it; see breakName. */
export const clusterName = breakName;

export function buildInsights(model: YearModel, ctx: BuildContext): YearInsights {
  const S = ctx.settings;
  const holidayName = (k: string): string => (S.holidays ? ctx.lookup(yearOf(k))[k] || '' : '');
  const holidaysIn = (start: string, end: string): string[] => {
    const names: string[] = [];
    eachDay(start, end, (k) => {
      const h = holidayName(k);
      if (h) names.push(h);
    });
    return names;
  };

  let days = 0;
  let weekendDays = 0;
  let workingDays = 0;
  let bridgeDays = 0;
  let plannedDays = 0;
  const holidays: HolidayFact[] = [];
  const tripIds = new Set<string>();
  const blocks = new Map<string, Suggestion>();

  for (const m of model.months) {
    for (const c of m.cells) {
      if (!c) continue;
      days++;
      const weekday = new Date(ms(c.key)).getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      if (weekend) weekendDays++;
      if (c.holiday) holidays.push({ key: c.key, name: c.holiday, weekday });
      else if (!weekend) workingDays++;
      if (c.kind === 'trip') {
        plannedDays++;
        const t = ctx.own[c.key];
        if (t) tripIds.add(t.id);
      }
      const b = c.best;
      if (!b) continue;
      if (b.leave === 1 && b.off >= BRIDGE_MIN_OFF) bridgeDays++;
      const value = b.off / b.leave;
      if (value < MIN_SUGGESTION_VALUE) continue;
      const id = `${b.from}:${b.to}`;
      if (blocks.has(id)) continue;
      let trip: Trip | null = null;
      eachDay(b.start, b.end, (k) => {
        if (!trip && ctx.own[k]) trip = ctx.own[k];
      });
      blocks.set(id, { id, off: b.off, leave: b.leave, value, from: b.from, to: b.to, start: b.start, end: b.end, holidays: holidaysIn(b.start, b.end), trip });
    }
  }

  const onWeekdays = holidays.filter((h) => h.weekday !== 0 && h.weekday !== 6);
  const onWeekends = holidays.filter((h) => h.weekday === 0 || h.weekday === 6);
  const byWeekday = DAY_SHORT.map(() => 0);
  for (const h of holidays) byWeekday[h.weekday]++;

  const suggestions = [...blocks.values()].sort(byValue);
  let longest: Suggestion | null = null;
  for (const s of suggestions) if (!longest || s.off > longest.off) longest = s;

  // Clusters: sweep the blocks by start and join each one into the cluster it overlaps.
  const clusters: Cluster[] = [];
  let group: Suggestion[] = [];
  let groupEnd = '';
  const close = () => {
    if (!group.length) return;
    const start = group[0].start;
    const end = group.reduce((e, s) => (s.end > e ? s.end : e), group[0].end);
    const options = [...group].sort(byLeave);
    const best = [...group].sort(byValue)[0];
    clusters.push({ id: start, holidays: holidaysIn(start, end), start, end, best, options });
    group = [];
    groupEnd = '';
  };
  for (const s of [...suggestions].sort(byStart)) {
    if (group.length && s.start > groupEnd) close();
    group.push(s);
    if (s.end > groupEnd) groupEnd = s.end;
  }
  close();

  const left = Math.max(0, S.allowance - model.used);
  return {
    year: model.y,
    days,
    weekendDays,
    workingDays,
    holidays,
    onWeekdays,
    onWeekends,
    byWeekday,
    bridgeDays,
    planned: { trips: tripIds.size, days: plannedDays, leave: model.used },
    left,
    suggestions,
    clusters,
    longest,
    plan: planLeave(suggestions, left),
  };
}

export { overlaps };
