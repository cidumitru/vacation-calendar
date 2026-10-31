import { describe, expect, it } from 'vitest';
import { heatLevel } from '@/components/heat-scale';
import { RO_2026 } from '../__fixtures__/holidays';
import { buildContext, buildYear } from '../calendar';
import { EMPTY_LOOKUP, toHolidayMap, type HolidayLookup } from '../holidays';
import { MIN_SUGGESTION_VALUE, buildInsights, clusterName, overlaps, planLeave, type Suggestion } from '../insights';
import { SEED_TRIPS } from '../storage';
import type { Settings, Trip } from '../types';

const RO: Settings = { holidays: true, country: 'RO', region: null, weekStart: 'Monday', allowance: 25, view: 'calendar' };
const ro2026 = toHolidayMap(RO_2026, 2026);
const ro2027 = { '2027-01-01': 'New Year’s Day', '2027-01-02': 'Day after New Year’s Day', '2027-01-06': 'Epiphany', '2027-01-07': 'Saint John the Baptist' };
const lookup: HolidayLookup = (y) => (y === 2026 ? ro2026 : y === 2027 ? ro2027 : {});
const insightsOf = (trips: Trip[], s: Settings = RO, lk: HolidayLookup = lookup) => {
  const ctx = buildContext(trips, '', '', s, lk);
  return buildInsights(buildYear(2026, ctx), ctx);
};
const span = (s: Suggestion) => `${s.start}..${s.end}`;
const deal = (s: Suggestion) => `${s.leave}→${s.off}`;

describe('Facts of the year', () => {
  const ins = insightsOf([]);

  it('splits 2026 in Romania into working days, weekends and public holidays', () => {
    expect(ins.days).toBe(365);
    expect(ins.weekendDays).toBe(104);
    expect(ins.holidays).toHaveLength(16);
    expect(ins.onWeekdays).toHaveLength(11);
    expect(ins.workingDays).toBe(365 - 104 - 11);
  });

  it('names the holidays lost to a weekend and counts them by weekday', () => {
    expect(ins.onWeekends.map((h) => `${h.name} ${h.key}`)).toEqual([
      'Unification Day 2026-01-24',
      'Easter Sunday 2026-04-12',
      'Pentecost 2026-05-31',
      'Assumption Day 2026-08-15',
      'Saint Stephen’s Day 2026-12-26',
    ]);
    // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    expect(ins.byWeekday).toEqual([2, 3, 2, 1, 1, 4, 3]);
  });

  it('counts the bridge days: one day of leave for four or more days off', () => {
    expect(ins.bridgeDays).toBe(12);
  });

  it('sums the trips of the year', () => {
    const seeded = insightsOf(SEED_TRIPS);
    expect(seeded.planned).toEqual({ trips: 3, days: 5 + 16 + 4, leave: 17 });
    expect(seeded.left).toBe(8);
    expect(ins.planned).toEqual({ trips: 0, days: 0, leave: 0 });
    expect(ins.left).toBe(25);
    expect(insightsOf(SEED_TRIPS, { ...RO, allowance: 10 }).left).toBe(0);
  });

  it('has nothing to say about holidays when they are off or not loaded', () => {
    for (const i of [insightsOf([], { ...RO, holidays: false }), insightsOf([], RO, EMPTY_LOOKUP)]) {
      expect(i.holidays).toEqual([]);
      expect(i.workingDays).toBe(261);
      expect(i.suggestions).toEqual([]);
      expect(i.clusters).toEqual([]);
      expect(i.plan).toEqual({ picks: [], leave: 0, off: 0, frontier: [] });
    }
  });
});

describe('Suggested breaks', () => {
  const ins = insightsOf([]);

  it('lists every distinct block the heat map shows, best value first', () => {
    expect(heatLevel(MIN_SUGGESTION_VALUE)).toBeGreaterThan(0);
    expect(heatLevel(MIN_SUGGESTION_VALUE - 0.01)).toBe(0);
    expect(ins.suggestions).toHaveLength(29);
    expect(new Set(ins.suggestions.map((s) => s.id)).size).toBe(29);
    const top = ins.suggestions.slice(0, 6).map((s) => `${deal(s)} ${span(s)}`);
    expect(top).toEqual([
      '1→7 2026-01-01..2026-01-07', // Mon 5 Jan bridges New Year and Epiphany
      '1→5 2026-04-09..2026-04-13', // Thu before Good Friday
      '1→5 2026-04-10..2026-04-14', // Tue after Easter Monday
      '1→5 2026-11-27..2026-12-01', // Fri before Saint Andrew's Day and National Day
      '1→5 2026-11-28..2026-12-02', // Wed after them
      '2→8 2026-01-01..2026-01-08', // Mon 5 and Thu 8 Jan
    ]);
    for (let i = 1; i < ins.suggestions.length; i++) expect(ins.suggestions[i - 1].value).toBeGreaterThanOrEqual(ins.suggestions[i].value);
    expect(ins.suggestions.every((s) => s.value >= MIN_SUGGESTION_VALUE)).toBe(true);
    expect(ins.longest && deal(ins.longest)).toBe('5→13'); // Mon 5 – Tue 13 Jan: Thu 1 – Tue 13
  });

  it('names the holidays inside a break', () => {
    const jan = ins.suggestions[0];
    expect(jan.holidays).toEqual(['New Year’s Day', 'Day after New Year’s Day', 'Epiphany', 'Saint John the Baptist']);
    expect(clusterName(jan.holidays)).toBe('New Year’s Day – Saint John the Baptist');
    expect(clusterName(['Good Friday', 'Easter Sunday', 'Easter Monday'])).toBe('Good Friday – Easter Monday');
    expect(clusterName(['Labour Day'])).toBe('Labour Day');
    expect(clusterName(['Pentecost', 'Children’s Day · Whit Monday'])).toBe('Pentecost & Children’s Day');
    expect(clusterName(['Pentecost', 'Pentecost'])).toBe('Pentecost');
    expect(clusterName([])).toBe('Break');
  });

  it('gathers the blocks around each holiday into one cluster, in date order', () => {
    expect(ins.clusters.map((c) => `${c.start}..${c.end}`)).toEqual([
      '2026-01-01..2026-01-13',
      '2026-04-04..2026-04-19',
      '2026-04-29..2026-05-05',
      '2026-05-28..2026-06-03',
      '2026-11-26..2026-12-07',
      '2026-12-23..2027-01-03',
    ]);
    const [jan, easter, , , , xmas] = ins.clusters;
    expect(jan.options.map(deal)).toEqual(['1→7', '2→8', '3→11', '4→12', '5→13']);
    expect(jan.best).toBe(jan.options[0]);
    expect(clusterName(jan.holidays)).toBe('New Year’s Day – Saint John the Baptist');
    // The cheapest first, the longest among equals.
    expect(easter.options.map(deal)).toEqual(['1→5', '1→5', '2→6', '2→6', '4→10', '4→10']);
    expect(clusterName(easter.holidays)).toBe('Good Friday – Easter Monday');
    expect(xmas.options.map((s) => `${deal(s)} ${span(s)}`)).toEqual([
      '1→4 2026-12-24..2026-12-27',
      '1→4 2026-12-25..2026-12-28',
      '1→4 2026-12-31..2027-01-03',
      '2→5 2026-12-23..2026-12-27',
      '4→10 2026-12-25..2027-01-03',
    ]);
    expect(xmas.holidays).toEqual(['Christmas Day', 'Saint Stephen’s Day', 'New Year’s Day', 'Day after New Year’s Day']);
    // Every option of a cluster overlaps another one in it.
    for (const c of ins.clusters) for (const s of c.options) expect(c.options.some((o) => o !== s && overlaps(o, s))).toBe(c.options.length > 1);
  });

  it('marks a break a trip already covers', () => {
    const easterTrip: Trip = { id: 'e', name: 'Easter', from: '2026-04-11', to: '2026-04-12', color: '#0A7D8C' };
    const i = insightsOf([easterTrip]);
    const easter = i.clusters[1];
    expect(easter.options.every((s) => s.trip === easterTrip)).toBe(true);
    expect(i.clusters[0].options.every((s) => s.trip === null)).toBe(true);
    expect(insightsOf(SEED_TRIPS).suggestions.every((s) => s.trip === null)).toBe(true);
  });
});

describe('The best use of the leave left', () => {
  it('buys the most days off within the leave, and spends no day for nothing', () => {
    const { plan } = insightsOf(SEED_TRIPS); // 8 days left
    expect(plan.leave).toBe(8);
    expect(plan.off).toBe(34);
    expect(plan.picks.reduce((n, s) => n + s.leave, 0)).toBe(8);
    expect(plan.picks.reduce((n, s) => n + s.off, 0)).toBe(34);
    for (let i = 1; i < plan.picks.length; i++) {
      expect(plan.picks[i - 1].start < plan.picks[i].start).toBe(true);
      for (let j = 0; j < i; j++) expect(overlaps(plan.picks[j], plan.picks[i])).toBe(false);
    }
    expect(plan.frontier).toEqual([
      { leave: 1, off: 7 },
      { leave: 2, off: 12 },
      { leave: 3, off: 17 },
      { leave: 4, off: 21 },
      { leave: 5, off: 25 },
      { leave: 6, off: 29 },
      { leave: 7, off: 33 },
      { leave: 8, off: 34 },
    ]);
  });

  it('stops spending once nothing more fits', () => {
    const { plan } = insightsOf([]); // 25 days, more than the breaks can use
    expect(plan.off).toBe(53);
    expect(plan.leave).toBe(21);
    expect(plan.frontier[plan.frontier.length - 1]).toEqual({ leave: 21, off: 53 });
  });

  it('leaves out the breaks a trip already covers', () => {
    const jan: Trip = { id: 'j', name: 'Ski', from: '2026-01-03', to: '2026-01-04', color: '#0A7D8C' };
    const { plan, suggestions } = insightsOf([jan], { ...RO, allowance: 1 });
    expect(suggestions[0].trip).toBe(jan);
    expect(plan.picks.map(deal)).toEqual(['1→5']);
    expect(plan.picks[0].start).toBe('2026-04-09');
  });

  it('has nothing to plan without leave', () => {
    const { suggestions } = insightsOf([]);
    expect(planLeave(suggestions, 0)).toEqual({ picks: [], leave: 0, off: 0, frontier: [] });
    expect(insightsOf(SEED_TRIPS, { ...RO, allowance: 17 }).plan.picks).toEqual([]);
  });

  it('can take two breaks from one cluster when they do not overlap', () => {
    // Christmas: Thu 24 (Dec 24–27) and Thu 31 (Dec 31 – Jan 3) share a cluster through Mon 28 – Thu 31 but not a day.
    const xmas = insightsOf([]).clusters[5].options;
    const plan = planLeave(xmas, 2);
    expect(plan.picks.map(span)).toEqual(['2026-12-24..2026-12-27', '2026-12-31..2027-01-03']);
    expect(plan).toMatchObject({ leave: 2, off: 8 });
  });
});
