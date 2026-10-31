import { describe, expect, it } from 'vitest';
import { RO_2026 } from '../__fixtures__/holidays';
import { bestBlock, buildContext, buildYear, count, draftRange, freeFn, isFree, valueOf } from '../calendar';
import { EMPTY_LOOKUP, toHolidayMap, type HolidayLookup } from '../holidays';
import { SEED_TRIPS } from '../storage';
import type { Settings, Trip } from '../types';

const RO: Settings = { holidays: true, country: 'RO', region: null, weekStart: 'Monday', allowance: 25, view: 'calendar' };
const ro2026 = toHolidayMap(RO_2026, 2026);
// 2027: the January holidays, for the cross-year and block tests below.
const ro2027 = {
  '2027-01-01': 'New Year’s Day',
  '2027-01-02': 'Day after New Year’s Day',
  '2027-01-06': 'Epiphany',
  '2027-01-07': 'Saint John the Baptist',
  '2027-01-24': 'Unification Day',
};
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

describe('Value of a day (heat map)', () => {
  const block = (k: string) => bestBlock(k, freeFn(RO, lookup));

  it('counts the days off one day of leave buys where a single day is the best block', () => {
    expect(valueOf('2026-04-30', RO, lookup)).toBe(4); // Thu before Labour Day (Fri 1 May): Thu–Sun
    expect(valueOf('2026-05-04', RO, lookup)).toBe(4); // Mon after it: Fri–Mon
    expect(valueOf('2026-01-05', RO, lookup)).toBe(7); // bridges New Year (Thu, Fri) and Epiphany (Tue, Wed)
    expect(block('2026-01-05')).toEqual({ off: 7, leave: 1, from: '2026-01-05', to: '2026-01-05', start: '2026-01-01', end: '2026-01-07' });
  });

  it('leaves a week with no public holiday around alone', () => {
    // A regular Monday or Friday buys 3 for 1 and a full week 9 for 5, but neither captures a holiday.
    expect(valueOf('2026-03-02', RO, lookup)).toBe(0);
    expect(valueOf('2026-03-04', RO, lookup)).toBe(0);
    expect(valueOf('2026-03-06', RO, lookup)).toBe(0);
    expect(block('2026-03-06')).toBeNull();
    // A holiday falling on a Saturday (Unification Day, 24 Jan 2026) adds nothing to its Friday either.
    expect(valueOf('2026-01-23', RO, lookup)).toBe(0);
  });

  it('joins a day between two hits into one long break', () => {
    // Mon 30 Nov and Tue 1 Dec 2026 are holidays: Wed 2 alone buys 5 (Sat–Wed); Thu 3 alone buys 1,
    // but Wed–Fri buys Sat 28 Nov – Sun 6 Dec, 9 days for 3, as good per day as a regular Friday.
    expect(block('2026-12-02')).toEqual({ off: 5, leave: 1, from: '2026-12-02', to: '2026-12-02', start: '2026-11-28', end: '2026-12-02' });
    expect(valueOf('2026-12-03', RO, lookup)).toBe(3);
    const chain = { off: 9, leave: 3, from: '2026-12-02', to: '2026-12-04', start: '2026-11-28', end: '2026-12-06' };
    expect(block('2026-12-03')).toEqual(chain);
    // Fri 4 alone is also 3 for 1; the longer break wins the tie.
    expect(block('2026-12-04')).toEqual(chain);
    // Jan 2027: Fri 1, Sat 2, Wed 6, Thu 7 are holidays. Mon 4 alone buys 4; Tue 5 pairs with it for 7 in 2.
    expect(block('2027-01-04')).toEqual({ off: 4, leave: 1, from: '2027-01-04', to: '2027-01-04', start: '2027-01-01', end: '2027-01-04' });
    expect(valueOf('2027-01-05', RO, lookup)).toBe(3.5);
    expect(block('2027-01-05')).toEqual({ off: 7, leave: 2, from: '2027-01-04', to: '2027-01-05', start: '2027-01-01', end: '2027-01-07' });
    // Christmas week 2026: Mon 28 – Thu 31 buys Fri 25 Dec – Sun 3 Jan, 10 days for 4.
    expect(valueOf('2026-12-29', RO, lookup)).toBe(2.5);
    expect(block('2026-12-29')).toEqual({ off: 10, leave: 4, from: '2026-12-28', to: '2026-12-31', start: '2026-12-25', end: '2027-01-03' });
  });

  it('is 0 on a free day and ignores holidays when they are off or not loaded', () => {
    expect(valueOf('2026-05-01', RO, lookup)).toBe(0); // the holiday itself
    expect(valueOf('2026-05-02', RO, lookup)).toBe(0); // Saturday
    expect(block('2026-05-02')).toBeNull();
    // Without holidays there is nothing to capture
    expect(valueOf('2026-04-30', { ...RO, holidays: false }, lookup)).toBe(0);
    expect(valueOf('2026-04-30', RO, EMPTY_LOOKUP)).toBe(0);
  });

  it('looks across the year edge', () => {
    // Wed 31 Dec 2025 → Thu 1 and Fri 2 Jan 2026 are holidays, then the weekend
    expect(valueOf('2025-12-31', RO, lookup)).toBe(5);
    // Thu 31 Dec 2026 → Fri 1 and Sat 2 Jan 2027 are holidays, then Sunday
    expect(valueOf('2026-12-31', RO, lookup)).toBe(4);
  });

  it('puts the value and the block on every day cell', () => {
    const dec = buildYear(2026, ctxOf(SEED_TRIPS)).months[11];
    const cell = (k: string) => dec.cells.find((c) => c?.key === k)!;
    expect(cell('2026-12-02').value).toBe(5);
    expect(cell('2026-12-02').best).toEqual({ off: 5, leave: 1, from: '2026-12-02', to: '2026-12-02', start: '2026-11-28', end: '2026-12-02' });
    expect(cell('2026-12-03').value).toBe(3);
    expect(cell('2026-12-09').value).toBe(0); // Wed 9: every block through it misses the holidays
    expect(cell('2026-12-09').best).toBeNull();
    expect(cell('2026-12-05').value).toBe(0); // Saturday
    expect(cell('2026-12-05').best).toBeNull();
  });

  it('lets a free day take the heat of the strongest break covering it, across the year edge too', () => {
    const y26 = buildYear(2026, ctxOf([]));
    const y27 = buildYear(2027, ctxOf([]));
    const heat = (y: typeof y26, k: string) => y.months[Number(k.slice(5, 7)) - 1].cells.find((c) => c?.key === k)!.heat;
    expect(heat(y26, '2026-12-03')).toBe(3); // a working day: its own value
    expect(heat(y26, '2026-03-07')).toBe(0); // a regular Saturday: no holiday around, no heat
    expect(heat(y26, '2026-11-29')).toBe(5); // Sun before St Andrew's: inside Wed 2 Dec's 5-day break
    expect(heat(y26, '2026-12-05')).toBe(3); // Sat after the Wed–Fri chain: its tail
    expect(heat(y26, '2026-12-25')).toBe(4); // Christmas Day: inside Thu 24's and Mon 28's breaks
    expect(heat(y27, '2027-01-01')).toBe(4); // New Year's Day: inside Thu 31 Dec 2026's break
    expect(heat(y27, '2027-01-06')).toBe(5); // Epiphany: inside Fri 8's break
    expect(heat(y27, '2027-01-09')).toBe(5); // and the weekend after it
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
