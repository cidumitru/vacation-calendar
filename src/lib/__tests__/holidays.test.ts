import { describe, expect, it } from 'vitest';
import { GB_2026, RO_2026 } from '../__fixtures__/nager';
import { applies, countHolidays, regionsOf, toHolidayMap } from '../holidays';

describe('toHolidayMap', () => {
  it('maps dates to names and merges two holidays on one date with " · "', () => {
    const map = toHolidayMap(RO_2026, null, 2026);
    expect(countHolidays(map)).toBe(16);
    expect(map['2026-06-01']).toBe('Children’s Day · Whit Monday');
    expect(map['2026-12-25']).toBe('Christmas Day');
  });

  it('keeps only the asked year', () => {
    const mixed = [...RO_2026, { ...RO_2026[0], date: '2027-01-01' }];
    expect(countHolidays(toHolidayMap(mixed, null, 2026))).toBe(16);
    expect(toHolidayMap(mixed, null, 2027)).toEqual({ '2027-01-01': 'New Year’s Day' });
  });

  it('includes regional holidays only for the selected region', () => {
    const nationwide = toHolidayMap(GB_2026, null, 2026);
    const scotland = toHolidayMap(GB_2026, 'GB-SCT', 2026);
    const england = toHolidayMap(GB_2026, 'GB-ENG', 2026);
    expect(countHolidays(nationwide)).toBe(6);
    expect(countHolidays(scotland)).toBe(9);
    expect(countHolidays(england)).toBe(8);
    expect(scotland['2026-08-03']).toBe('Summer Bank Holiday');
    expect(england['2026-08-03']).toBeUndefined();
    expect(england['2026-08-31']).toBe('Summer Bank Holiday');
  });

  it('ignores types that are not public holidays', () => {
    expect(toHolidayMap(GB_2026, 'GB-ENG', 2026)['2026-12-31']).toBeUndefined();
    expect(applies(GB_2026[GB_2026.length - 1], 'GB-ENG')).toBe(false);
  });

  it('treats a holiday with no counties as nationwide even if global is false', () => {
    const h = { ...RO_2026[0], global: false, counties: null };
    expect(applies(h, null)).toBe(true);
  });
});

describe('regionsOf', () => {
  it('lists the distinct subdivision codes, sorted', () => {
    expect(regionsOf(GB_2026)).toEqual(['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']);
    expect(regionsOf(RO_2026)).toEqual([]);
  });
});
