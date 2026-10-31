// Runs the real date-holidays rules, so these tests pin what the app shows for the countries it was built around.
import { describe, expect, it } from 'vitest';
import { RO_2026 } from '../__fixtures__/holidays';
import { DAY, isoMs, ms } from '../dates';
import { createEngine, subdivisionOf } from '../holidayEngine';
import { countHolidays, toHolidayMap, type Holiday } from '../holidays';

const engine = createEngine();
const publicDates = (list: Holiday[]): string[] => [...new Set(list.filter((h) => h.type === 'public').map((h) => h.date))].sort();
const map = (country: string, region: string | null, year: number) => toHolidayMap(engine.holidays(country, region, year) ?? [], year);

describe('createEngine', () => {
  it('lists the countries sorted by English name, with two-letter codes', () => {
    const countries = engine.countries();
    expect(countries.length).toBeGreaterThan(150);
    expect(countries.every((c) => /^[A-Z]{2}$/.test(c.code))).toBe(true);
    expect(countries.map((c) => c.name)).toEqual([...countries.map((c) => c.name)].sort((a, b) => a.localeCompare(b, 'en')));
    expect(countries.find((c) => c.code === 'RO')?.name).toBe('Romania');
    expect(engine.countries()).toBe(countries); // computed once
  });

  it('gives Romania the 16 dates of the published 2026 calendar, two holidays on 1 June included', () => {
    const list = engine.holidays('RO', null, 2026)!;
    expect(publicDates(list)).toEqual(publicDates(RO_2026));
    const ro = toHolidayMap(list, 2026);
    expect(countHolidays(ro)).toBe(16);
    expect(ro['2026-04-10']).toBe('Good Friday');
    expect(ro['2026-06-01']).toContain(' · ');
    expect(list.every((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.date))).toBe(true);
  });

  it('lists every day of a holiday that spans several', () => {
    const ro = engine.holidays('RO', null, 2026)!.filter((h) => h.name === "New Year's Day");
    expect(ro.map((h) => h.date)).toEqual(['2026-01-01', '2026-01-02']);
    const kr = engine.holidays('KR', null, 2026)!.filter((h) => h.name === 'Korean New Year').map((h) => h.date);
    expect(kr).toHaveLength(3); // three consecutive days from the rule's first day
    expect(kr).toEqual([kr[0], isoMs(ms(kr[0]) + DAY), isoMs(ms(kr[0]) + 2 * DAY)]);
  });

  it('keeps observances in the list but out of the count', () => {
    const list = engine.holidays('RO', null, 2026)!;
    expect(list.some((h) => h.type === 'observance')).toBe(true);
    expect(countHolidays(toHolidayMap(list, 2026))).toBe(16);
  });

  it('knows the regions of a country whose holidays differ, and none for the rest', () => {
    const gb = engine.regions('GB');
    expect(gb).toEqual(expect.arrayContaining([{ code: 'GB-SCT', name: 'Scotland' }, { code: 'GB-ENG', name: 'England' }]));
    expect(gb.map((r) => r.name)).toEqual([...gb.map((r) => r.name)].sort((a, b) => a.localeCompare(b, 'en')));
    expect(engine.regions('DE').some((r) => r.code === 'DE-BY')).toBe(true);
    expect(engine.regions('RO')).toEqual([]);
    expect(engine.regions('XX')).toEqual([]);
  });

  it('adds the holidays of the selected region to the nationwide ones', () => {
    const nationwide = map('GB', null, 2026);
    const scotland = map('GB', 'GB-SCT', 2026);
    const england = map('GB', 'GB-ENG', 2026);
    expect(scotland['2026-01-02']).toBe('January 2nd');
    expect(scotland['2026-08-03']).toBe('Summer bank holiday');
    expect(scotland['2026-08-31']).toBeUndefined();
    expect(england['2026-08-03']).toBeUndefined();
    expect(england['2026-08-31']).toBe('Summer bank holiday');
    expect(england['2026-04-06']).toBe('Easter Monday');
    expect(nationwide['2026-01-02']).toBeUndefined();
    expect(nationwide['2026-08-03']).toBeUndefined();
    expect(nationwide['2026-12-25']).toBe('Christmas Day');
    expect(countHolidays(map('DE', 'DE-BY', 2026))).toBeGreaterThan(countHolidays(map('DE', null, 2026)));
  });

  it('falls back to the nationwide holidays for a region of another country or an unknown one', () => {
    expect(engine.holidays('GB', 'DE-BY', 2026)).toEqual(engine.holidays('GB', null, 2026));
    expect(engine.holidays('GB', 'GB-XYZ', 2026)).toEqual(engine.holidays('GB', null, 2026));
  });

  it('returns undefined for an unknown country', () => {
    expect(engine.holidays('XX', null, 2026)).toBeUndefined();
    expect(engine.holidays('ro', null, 2026)).toBeUndefined();
  });

  it('computes any year of the calendar', () => {
    expect(publicDates(engine.holidays('RO', null, 2099)!)).toHaveLength(16);
    expect(publicDates(engine.holidays('US', null, 1950)!).length).toBeGreaterThan(5);
    expect(map('RO', null, 2027)['2027-01-01']).toBe("New Year's Day");
  });
});

describe('subdivisionOf', () => {
  it('strips the country prefix and rejects codes of other countries', () => {
    expect(subdivisionOf('GB', 'GB-SCT')).toBe('SCT');
    expect(subdivisionOf('GB', 'DE-BY')).toBeNull();
    expect(subdivisionOf('GB', 'GB-')).toBeNull();
    expect(subdivisionOf('GB', null)).toBeNull();
  });
});
