import { describe, expect, it } from 'vitest';
import { RO_2026, RO_2026_ALL } from '../__fixtures__/holidays';
import { countHolidays, counts, toHolidayMap } from '../holidays';

describe('toHolidayMap', () => {
  it('maps dates to names and merges two holidays on one date with " · "', () => {
    const map = toHolidayMap(RO_2026, 2026);
    expect(countHolidays(map)).toBe(16);
    expect(map['2026-06-01']).toBe('Children’s Day · Whit Monday');
    expect(map['2026-12-25']).toBe('Christmas Day');
  });

  it('keeps only the asked year', () => {
    const mixed = [...RO_2026, { ...RO_2026[0], date: '2027-01-01' }];
    expect(countHolidays(toHolidayMap(mixed, 2026))).toBe(16);
    expect(toHolidayMap(mixed, 2027)).toEqual({ '2027-01-01': 'New Year’s Day' });
  });

  it('ignores types that are not public holidays', () => {
    const map = toHolidayMap(RO_2026_ALL, 2026);
    expect(countHolidays(map)).toBe(16);
    expect(map['2026-03-08']).toBeUndefined();
    expect(counts(RO_2026[0])).toBe(true);
    expect(counts({ date: '2026-03-08', name: 'Mother’s Day', type: 'observance' })).toBe(false);
    expect(counts({ date: '2026-12-24', name: 'Christmas Eve', type: 'bank' })).toBe(false);
  });

  it('does not repeat a name listed twice for one date', () => {
    const map = toHolidayMap([RO_2026[0], { ...RO_2026[0] }], 2026);
    expect(map['2026-01-01']).toBe('New Year’s Day');
  });
});
