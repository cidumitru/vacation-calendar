// Public holidays computed in the browser from the rules of date-holidays
// (https://github.com/commenthol/date-holidays; data CC BY-SA 3.0): 200+ countries, 37 of them
// with regions, for any year. Import this module only through holidayStore, which loads it lazily
// so that the rules travel in their own chunk and the calendar paints before they arrive.

import Holidays from 'date-holidays';
import { DAY, isoMs, ms } from './dates';
import type { Country, Holiday, HolidayType, Region } from './holidays';

export interface HolidayEngine {
  /** Every country the rules cover, sorted by English name. */
  countries(): Country[];
  /** The regions of a country whose holidays differ by region, sorted by name; [] for the rest. */
  regions(country: string): Region[];
  /** The holidays of a year: nationwide ones, plus the region's when one of regions(country) is given. Undefined for an unknown country. */
  holidays(country: string, region: string | null, year: number): Holiday[] | undefined;
}

const TYPES: HolidayType[] = ['public', 'bank', 'school', 'optional', 'observance'];
const COUNTRY_RE = /^[A-Z]{2}$/;
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en');

/** The subdivision part of a region code, when the code belongs to the country: 'GB-SCT' → 'SCT'. */
export function subdivisionOf(country: string, region: string | null): string | null {
  if (!region || !region.startsWith(`${country}-`)) return null;
  return region.slice(country.length + 1) || null;
}

export function createEngine(): HolidayEngine {
  const catalogue = new Holidays();
  const countryNames = catalogue.getCountries('en');
  let countries: Country[] | null = null;
  const regions = new Map<string, Region[]>();
  const calendars = new Map<string, Holidays>();

  const regionsOf = (country: string): Region[] => {
    let list = regions.get(country);
    if (!list) {
      const states = country in countryNames ? catalogue.getStates(country, 'en') : undefined;
      list = Object.entries(states ?? {})
        .map(([code, name]) => ({ code: `${country}-${code}`, name }))
        .sort(byName);
      regions.set(country, list);
    }
    return list;
  };

  return {
    countries() {
      if (!countries) {
        countries = Object.entries(countryNames)
          .filter(([code]) => COUNTRY_RE.test(code))
          .map(([code, name]) => ({ code, name }))
          .sort(byName);
      }
      return countries;
    },

    regions: regionsOf,

    holidays(country, region, year) {
      if (!(country in countryNames)) return undefined;
      const sub = subdivisionOf(country, region);
      const state = sub && regionsOf(country).some((r) => r.code === region) ? sub : null;
      const key = state ? `${country}-${state}` : country;
      let calendar = calendars.get(key);
      if (!calendar) {
        calendar = state ? new Holidays(country, state) : new Holidays(country);
        calendars.set(key, calendar);
      }
      const out: Holiday[] = [];
      for (const h of calendar.getHolidays(year, 'en')) {
        const type = TYPES.includes(h.type) ? h.type : 'observance';
        // `date` is the local date the holiday starts on; start/end span its duration (one day for most,
        // several for e.g. Eid or Korean New Year, a few hours for a half day), so list every day it covers.
        const first = h.date.slice(0, 10);
        const days = Math.max(1, Math.round((h.end.getTime() - h.start.getTime()) / DAY));
        for (let i = 0; i < days; i++) out.push({ date: i ? isoMs(ms(first) + i * DAY) : first, name: h.name, type });
      }
      return out;
    },
  };
}
