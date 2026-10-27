import { describe, expect, it } from 'vitest';
import { buildContext, buildYear, count, draftRange, isFree } from '../calendar';
import { SEED_TRIPS, guessCountry } from '../storage';
import type { Settings, Trip } from '../types';

const RO: Settings = { holidays: true, country: 'RO', weekStart: 'Monday', allowance: 25 };

describe('Counting days off', () => {
  it('seeds with Romania and 25 days give 17 planned and 8 left in 2026', () => {
    const year = buildYear(2026, buildContext(SEED_TRIPS, '', '', RO, '#0071E3'));
    expect(year.used).toBe(17);
    expect(RO.allowance - year.used).toBe(8);
    expect(Object.keys(year.offBy)).toHaveLength(3);
  });

  it('Fri 6 Mar → Tue 10 Mar 2026 is 5 days, 3 off work', () => {
    expect(count('2026-03-06', '2026-03-10', RO)).toEqual({ all: 5, off: 3 });
  });

  it('holidays cost like weekdays when holidays are off', () => {
    const off: Settings = { ...RO, holidays: false };
    expect(isFree('2026-12-25', RO)).toBe(true);
    expect(isFree('2026-12-25', off)).toBe(false);
    expect(isFree('2026-12-26', off)).toBe(true); // Saturday
  });

  it('a trip across New Year splits its cost between the two years', () => {
    const trips: Trip[] = [{ id: 'x', name: 'NY', from: '2026-12-28', to: '2027-01-05', color: '#0A7D8C' }];
    const y26 = buildYear(2026, buildContext(trips, '', '', RO, '#0071E3'));
    const y27 = buildYear(2027, buildContext(trips, '', '', RO, '#0071E3'));
    // 2026: Mon 28, Tue 29, Wed 30, Thu 31 = 4 weekdays, none a RO holiday
    expect(y26.offBy.x).toBe(4);
    // 2027: Fri 1 (holiday), Sat 2, Sun 3, Mon 4, Tue 5 → 2 off
    expect(y27.offBy.x).toBe(2);
  });

  it('month header counts the cost inside that month', () => {
    const year = buildYear(2026, buildContext(SEED_TRIPS, '', '', RO, '#0071E3'));
    expect(year.months[6].off).toBe('10 days off'); // Summer: 18 Jul – 2 Aug, July part
    expect(year.months[7].off).toBe(''); // Sat 1 – Sun 2 Aug cost nothing
    expect(year.months[1].off).toBe('5 days off');
  });
});

describe('Day cell states', () => {
  it('marks trip ends with a solid circle and middles with ink', () => {
    const year = buildYear(2026, buildContext(SEED_TRIPS, '', '', RO, '#0071E3'));
    const feb = year.months[1];
    const c16 = feb.cells.find((c) => c?.key === '2026-02-16')!;
    const c18 = feb.cells.find((c) => c?.key === '2026-02-18')!;
    expect(c16.cbg).toBe('#0A7D8C');
    expect(c16.fg).toBe('#FFFFFF');
    expect(c18.cbg).toBe('transparent');
    expect(c18.fg).toBe('#075E69');
    expect(c16.aria).toBe('Mon 16 February, Winter break');
  });

  it('joins bands within a week row and breaks them at the week edge', () => {
    const year = buildYear(2026, buildContext(SEED_TRIPS, '', '', RO, '#0071E3'));
    const feb = year.months[1];
    const cell = (k: string) => feb.cells.find((c) => c?.key === k)!;
    expect(cell('2026-02-16').radius).toBe('16px 0 0 16px'); // Monday, first column
    expect(cell('2026-02-18').radius).toBe('0 0 0 0');
    expect(cell('2026-02-20').radius).toBe('0 16px 16px 0'); // Friday, trip ends
    // Weekend Sat+Sun join when weeks start on Monday
    expect(cell('2026-02-21').radius).toBe('16px 0 0 16px');
    expect(cell('2026-02-22').radius).toBe('0 16px 16px 0');
  });

  it('Sunday week start moves the blank lead cells', () => {
    const mon = buildYear(2026, buildContext([], '', '', RO, '#0071E3'));
    const sun = buildYear(2026, buildContext([], '', '', { ...RO, weekStart: 'Sunday' }, '#0071E3'));
    // 1 Jan 2026 is a Thursday: 3 blanks with Monday start, 4 with Sunday start
    expect(mon.months[0].cells.filter((c) => c === null)).toHaveLength(3);
    expect(sun.months[0].cells.filter((c) => c === null)).toHaveLength(4);
    expect(sun.weekdays[0]).toBe('S');
    expect(mon.weekdays[0]).toBe('M');
  });

  it('shows the draft with the accent and a black circle on a trip day first click', () => {
    const ctx = buildContext(SEED_TRIPS, '2026-03-06', '2026-03-10', RO, '#0071E3');
    const mar = buildYear(2026, ctx).months[2];
    const c6 = mar.cells.find((c) => c?.key === '2026-03-06')!;
    const c8 = mar.cells.find((c) => c?.key === '2026-03-08')!;
    expect(c6.cbg).toBe('#0071E3');
    expect(c8.bg).toBe('rgba(0, 113, 227, 0.12)');
    const ctx2 = buildContext(SEED_TRIPS, '2026-02-17', '', RO, '#0071E3');
    const c17 = buildYear(2026, ctx2).months[1].cells.find((c) => c?.key === '2026-02-17')!;
    expect(c17.cbg).toBe('#1D1D1F');
  });

  it('normalises a reversed draft range', () => {
    expect(draftRange('2026-03-10', '2026-03-06')).toEqual(['2026-03-06', '2026-03-10']);
    expect(draftRange('2026-03-06', '')).toEqual(['2026-03-06', '2026-03-06']);
    expect(draftRange('', '')).toEqual(['', '']);
  });
});

describe('Default country', () => {
  it('prefers the time zone, then the language, then RO', () => {
    expect(guessCountry('Europe/Bucharest', 'en-US')).toBe('RO');
    expect(guessCountry('America/New_York', 'fr')).toBe('US');
    expect(guessCountry('Pacific/Honolulu', '')).toBe('US');
    expect(guessCountry('Asia/Tokyo', 'ro-MD')).toBe('MD');
    expect(guessCountry('Asia/Tokyo', 'en-GB')).toBe('GB-EAW');
    expect(guessCountry('Asia/Tokyo', 'de-AT')).toBe('DE');
    expect(guessCountry('Asia/Tokyo', 'ja')).toBe('RO');
  });
});
