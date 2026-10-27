import type { NagerHoliday } from './nager';

/** 'YYYY-MM-DD' → holiday name(s), joined with ' · ' when two fall on one date. */
export type HolidayMap = Record<string, string>;

/** Resolves the holidays of a year for the current settings; {} while nothing is loaded. */
export type HolidayLookup = (year: number) => HolidayMap;

export const EMPTY_LOOKUP: HolidayLookup = () => ({});

/** Nager holiday types that count as a day off. Bank, School, Authorities, Optional and Observance do not. */
export const COUNTED_TYPES = ['Public'];

/** A holiday applies nationwide, or to the selected region when it is limited to some. */
export function applies(h: NagerHoliday, region: string | null): boolean {
  if (!h.types.some((t) => COUNTED_TYPES.includes(t))) return false;
  if (h.global || !h.counties) return true;
  return region != null && h.counties.includes(region);
}

export function toHolidayMap(list: NagerHoliday[], region: string | null, year: number): HolidayMap {
  const ys = String(year);
  const map: HolidayMap = {};
  const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const h of sorted) {
    if (!h.date.startsWith(ys) || !applies(h, region)) continue;
    const prev = map[h.date];
    if (!prev) map[h.date] = h.name;
    else if (!prev.split(' · ').includes(h.name)) map[h.date] = `${prev} · ${h.name}`;
  }
  return map;
}

/** Distinct subdivision codes the data names, sorted. Empty when every holiday is nationwide. */
export function regionsOf(list: NagerHoliday[]): string[] {
  const set = new Set<string>();
  for (const h of list) if (!h.global && h.counties) for (const c of h.counties) set.add(c);
  return [...set].sort();
}

export function countHolidays(map: HolidayMap): number {
  return Object.keys(map).length;
}
