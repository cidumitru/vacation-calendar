import { describe, expect, it } from 'vitest';
import { isoMs } from '../dates';
import { COUNTRIES, countHolidays, easterOrthodox, easterWestern, holidays } from '../holidays';
import type { CountryCode } from '../types';

describe('Easter', () => {
  it('2026: Western Sun 5 Apr, Orthodox Sun 12 Apr', () => {
    expect(isoMs(easterWestern(2026))).toBe('2026-04-05');
    expect(isoMs(easterOrthodox(2026))).toBe('2026-04-12');
  });
});

describe('Public holidays 2026 (distinct dates, observed and substitute days included)', () => {
  const expected: Record<CountryCode, number> = {
    FR: 11, DE: 9, IT: 13, MD: 13, PL: 14, RO: 16, ES: 10, 'GB-EAW': 9, 'GB-SCT': 10, US: 12,
  };
  for (const { code } of COUNTRIES) {
    it(`${code} has ${expected[code]} holidays`, () => {
      expect(countHolidays(code, 2026)).toBe(expected[code]);
    });
  }

  it('UK moves Boxing Day 2026 to Mon 28 Dec as a substitute day', () => {
    expect(holidays('GB-EAW', 2026)['2026-12-28']).toBe('Boxing Day (substitute day)');
    expect(holidays('GB-SCT', 2026)['2026-12-28']).toBe('Boxing Day (substitute day)');
  });

  it('US observes Independence Day 2026 on Fri 3 Jul', () => {
    expect(holidays('US', 2026)['2026-07-03']).toBe('Independence Day (observed)');
  });

  it('US observes New Year’s Day on Dec 31 when next Jan 1 is a Saturday (2021)', () => {
    expect(holidays('US', 2021)['2021-12-31']).toBe('New Year’s Day (observed)');
  });

  it('joins two holidays on the same date with " · " (RO 2026-06-01)', () => {
    expect(holidays('RO', 2026)['2026-06-01']).toBe('Children’s Day · Pentecost Monday');
  });

  it('applies "from" years (IT St Francis from 2026, PL Christmas Eve from 2025)', () => {
    expect(holidays('IT', 2025)['2025-10-04']).toBeUndefined();
    expect(holidays('IT', 2026)['2026-10-04']).toBe('St Francis of Assisi');
    expect(holidays('PL', 2024)['2024-12-24']).toBeUndefined();
    expect(holidays('PL', 2025)['2025-12-24']).toBe('Christmas Eve');
  });

  it('lists countries alphabetically by label', () => {
    const labels = COUNTRIES.map((c) => c.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en')));
  });
});
