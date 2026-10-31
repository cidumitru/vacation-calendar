/** The holiday types date-holidays distinguishes. Only 'public' counts as a day off. */
export type HolidayType = 'public' | 'bank' | 'school' | 'optional' | 'observance';

export interface Holiday {
  date: string; // 'YYYY-MM-DD'; a holiday that spans several days is listed once per day
  name: string; // English
  type: HolidayType;
}

/** A country the rules cover; code is ISO 3166-1 alpha-2, e.g. 'RO'. */
export interface Country {
  code: string;
  name: string;
}

/** A subdivision whose holidays differ from the nationwide ones; code is '<country>-<subdivision>', e.g. 'GB-SCT'. */
export interface Region {
  code: string;
  name: string;
}

/** 'YYYY-MM-DD' → holiday name(s), joined with ' · ' when two fall on one date. */
export type HolidayMap = Record<string, string>;

/** Resolves the holidays of a year for the current settings; {} while nothing is loaded. */
export type HolidayLookup = (year: number) => HolidayMap;

export const EMPTY_LOOKUP: HolidayLookup = () => ({});

/** Holiday types that count as a day off. Bank, school, optional and observance do not. */
export const COUNTED_TYPES: HolidayType[] = ['public'];

export function counts(h: Holiday): boolean {
  return COUNTED_TYPES.includes(h.type);
}

/** The counted holidays of one year as a map; entries from other years and other types are dropped. */
export function toHolidayMap(list: Holiday[], year: number): HolidayMap {
  const ys = String(year);
  const map: HolidayMap = {};
  const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const h of sorted) {
    if (!h.date.startsWith(ys) || !counts(h)) continue;
    const prev = map[h.date];
    if (!prev) map[h.date] = h.name;
    else if (!prev.split(' · ').includes(h.name)) map[h.date] = `${prev} · ${h.name}`;
  }
  return map;
}

export function countHolidays(map: HolidayMap): number {
  return Object.keys(map).length;
}

/**
 * A name for a break from the holidays inside it: the one it is built around, the two it joins, or the first and
 * last of a longer run. Where two holidays share a date only the first is used.
 */
export function breakName(holidays: string[]): string {
  const names: string[] = [];
  for (const h of holidays) {
    const n = h.split(' · ')[0];
    if (!names.includes(n)) names.push(n);
  }
  if (names.length === 0) return 'Break';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} – ${names[names.length - 1]}`;
}
