import { describe, expect, it } from 'vitest';
import { RO_2026 } from '../__fixtures__/nager';
import { buildContext, buildYear, count, draftRange, isFree } from '../calendar';
import { EMPTY_LOOKUP, toHolidayMap, type HolidayLookup } from '../holidays';
import { SEED_TRIPS } from '../storage';
import type { Settings, Trip } from '../types';

const RO: Settings = { holidays: true, country: 'RO', region: null, weekStart: 'Monday', allowance: 25 };
const ro2026 = toHolidayMap(RO_2026, null, 2026);
// 2027: only New Year’s Day matters for the cross-year test below.
const ro2027 = { '2027-01-01': 'New Year’s Day' };
const lookup: HolidayLookup = (y) => (y === 2026 ? ro2026 : y === 2027 ? ro2027 : {});
const ctxOf = (trips: Trip[], from = '', to = '', s: Settings = RO) => buildContext(trips, from, to, s, lookup);

describe('Counting days off', () => {
  it('seeds with Romania and 25 days give 17 planned and 8 left in 2026', () => {
    const year = buildYear(2026, ctxOf(SEED_TRIPS));
    expect(year.used).toBe(17);
    expect(RO.allowance - year.used).toBe(8);
    expect(Object.keys(year.offBy)).toHaveLength(3);
  });

  it('Fri 6 Mar → Tue 10 Mar 2026 is 5 days, 3 off work', () => {
    expect(count('2026-03-06', '2026-03-10', RO, lookup)).toEqual({ all: 5, off: 3 });
  });

  it('holidays cost like weekdays when holidays are off or not loaded', () => {
    const off: Settings = { ...RO, holidays: false };
    expect(isFree('2026-12-25', RO, lookup)).toBe(true);
    expect(isFree('2026-12-25', off, lookup)).toBe(false);
    expect(isFree('2026-12-25', RO, EMPTY_LOOKUP)).toBe(false);
    expect(isFree('2026-12-26', off, lookup)).toBe(true); // Saturday
  });

  it('a trip across New Year splits its cost between the two years', () => {
    const trips: Trip[] = [{ id: 'x', name: 'NY', from: '2026-12-28', to: '2027-01-05', color: '#0A7D8C' }];
    const y26 = buildYear(2026, ctxOf(trips));
    const y27 = buildYear(2027, ctxOf(trips));
    // 2026: Mon 28, Tue 29, Wed 30, Thu 31 = 4 weekdays, none a RO holiday
    expect(y26.offBy.x).toBe(4);
    // 2027: Fri 1 (holiday), Sat 2, Sun 3, Mon 4, Tue 5 → 2 off
    expect(y27.offBy.x).toBe(2);
  });

  it('month header counts the cost inside that month', () => {
    const year = buildYear(2026, ctxOf(SEED_TRIPS));
    expect(year.months[6].off).toBe(10); // Summer: 18 Jul – 2 Aug, July part
    expect(year.months[7].off).toBe(0); // Sat 1 – Sun 2 Aug cost nothing
    expect(year.months[1].off).toBe(5);
  });

  it('rebuilds the cost once holiday data arrives', () => {
    const trips: Trip[] = [{ id: 'x', name: 'Xmas', from: '2026-12-21', to: '2026-12-25', color: '#0A7D8C' }];
    expect(buildYear(2026, buildContext(trips, '', '', RO, EMPTY_LOOKUP)).used).toBe(5);
    expect(buildYear(2026, ctxOf(trips)).used).toBe(4);
  });
});

describe('Day cell states', () => {
  it('marks trip ends as solid circles and middles as band days in the trip colour', () => {
    const year = buildYear(2026, ctxOf(SEED_TRIPS));
    const feb = year.months[1];
    const c16 = feb.cells.find((c) => c?.key === '2026-02-16')!;
    const c18 = feb.cells.find((c) => c?.key === '2026-02-18')!;
    expect(c16).toMatchObject({ kind: 'trip', end: true, picked: false, color: '#0A7D8C' });
    expect(c18).toMatchObject({ kind: 'trip', end: false, color: '#0A7D8C' });
    expect(c16.aria).toBe('Mon 16 February, Winter break');
  });

  it('names holidays in the accessible name and the holiday field', () => {
    const year = buildYear(2026, ctxOf([]));
    const jun1 = year.months[5].cells.find((c) => c?.key === '2026-06-01')!;
    expect(jun1.holiday).toBe('Children’s Day · Whit Monday');
    expect(jun1.aria).toBe('Mon 1 June, Children’s Day · Whit Monday');
    expect(jun1.kind).toBe('holiday');
  });

  it('joins bands within a week row and breaks them at the week edge', () => {
    const year = buildYear(2026, ctxOf(SEED_TRIPS));
    const feb = year.months[1];
    const joins = (k: string) => {
      const c = feb.cells.find((x) => x?.key === k)!;
      return [c.joinLeft, c.joinRight];
    };
    expect(joins('2026-02-16')).toEqual([false, true]); // Monday, first column
    expect(joins('2026-02-18')).toEqual([true, true]);
    expect(joins('2026-02-20')).toEqual([true, false]); // Friday, trip ends
    // Weekend Sat+Sun join when weeks start on Monday
    expect(joins('2026-02-21')).toEqual([false, true]);
    expect(joins('2026-02-22')).toEqual([true, false]);
  });

  it('Sunday week start moves the blank lead cells', () => {
    const mon = buildYear(2026, ctxOf([]));
    const sun = buildYear(2026, ctxOf([], '', '', { ...RO, weekStart: 'Sunday' }));
    // 1 Jan 2026 is a Thursday: 3 blanks with Monday start, 4 with Sunday start
    expect(mon.months[0].cells.filter((c) => c === null)).toHaveLength(3);
    expect(sun.months[0].cells.filter((c) => c === null)).toHaveLength(4);
    expect(sun.weekdays[0]).toBe('S');
    expect(mon.weekdays[0]).toBe('M');
  });

  it('shows the draft as its own band and flags a first click on a trip day', () => {
    const mar = buildYear(2026, ctxOf(SEED_TRIPS, '2026-03-06', '2026-03-10')).months[2];
    const c6 = mar.cells.find((c) => c?.key === '2026-03-06')!;
    const c8 = mar.cells.find((c) => c?.key === '2026-03-08')!;
    expect(c6).toMatchObject({ kind: 'draft', end: true, color: null });
    expect(c8).toMatchObject({ kind: 'draft', end: false });
    const c17 = buildYear(2026, ctxOf(SEED_TRIPS, '2026-02-17')).months[1].cells.find((c) => c?.key === '2026-02-17')!;
    expect(c17).toMatchObject({ kind: 'trip', picked: true });
  });

  it('normalises a reversed draft range', () => {
    expect(draftRange('2026-03-10', '2026-03-06')).toEqual(['2026-03-06', '2026-03-10']);
    expect(draftRange('2026-03-06', '')).toEqual(['2026-03-06', '2026-03-06']);
    expect(draftRange('', '')).toEqual(['', '']);
  });
});
