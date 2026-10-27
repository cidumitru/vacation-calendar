import { DAY, iso, isoMs } from './dates';
import type { CountryCode } from './types';

export interface CountryOption {
  code: CountryCode;
  label: string;
}

/** Listed alphabetically by label. */
export const COUNTRIES: CountryOption[] = [
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany (nationwide)' },
  { code: 'IT', label: 'Italy' },
  { code: 'MD', label: 'Moldova' },
  { code: 'PL', label: 'Poland' },
  { code: 'RO', label: 'Romania' },
  { code: 'ES', label: 'Spain (national days)' },
  { code: 'GB-EAW', label: 'United Kingdom – England & Wales' },
  { code: 'GB-SCT', label: 'United Kingdom – Scotland' },
  { code: 'US', label: 'United States (federal)' },
];

export const COUNTRY_CODES: CountryCode[] = COUNTRIES.map((c) => c.code);

export function isCountryCode(v: unknown): v is CountryCode {
  return typeof v === 'string' && (COUNTRY_CODES as string[]).includes(v);
}

/** Caveat shown under the region select. */
export const REGION_CAVEATS: Partial<Record<CountryCode, string>> = {
  DE: 'Nationwide days only; your state may add more.',
  ES: 'National days only; your region adds its own.',
  US: 'Weekend dates move to the observed Friday or Monday.',
  'GB-EAW': 'Weekend dates get a substitute weekday.',
  'GB-SCT': 'Weekend dates get a substitute weekday.',
};

// Western (Gregorian) Easter: anonymous Gregorian algorithm
export function easterWestern(y: number): number {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}

// Orthodox Easter: Meeus Julian algorithm + 13 days (valid 1900–2099)
export function easterOrthodox(y: number): number {
  const a = y % 4, b = y % 7, c = y % 19;
  const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day) + 13 * DAY;
}

type Rule = '' | 'sub' | 'obs';

interface RawHoliday {
  t: number;
  name: string;
  rule: Rule;
}

function rawHolidays(c: CountryCode, y: number): RawHoliday[] {
  const D = (m: number, d: number) => Date.UTC(y, m, d);
  // n-th weekday wd (0 = Sunday) of month m
  const nth = (m: number, wd: number, n: number) => {
    const g1 = new Date(D(m, 1)).getUTCDay();
    return D(m, 1 + ((wd - g1 + 7) % 7) + (n - 1) * 7);
  };
  // last weekday wd of month m
  const last = (m: number, wd: number) => {
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const gl = new Date(D(m, dim)).getUTCDay();
    return D(m, dim - ((gl - wd + 7) % 7));
  };
  const ew = easterWestern(y);
  const eo = easterOrthodox(y);
  const out: RawHoliday[] = [];
  const add = (t: number, name: string, rule: Rule = '') => out.push({ t, name, rule });

  switch (c) {
    case 'RO':
      add(D(0, 1), 'New Year’s Day');
      add(D(0, 2), 'Day after New Year’s Day');
      if (y >= 2024) {
        add(D(0, 6), 'Epiphany');
        add(D(0, 7), 'St John the Baptist');
      }
      add(D(0, 24), 'Union Day');
      add(eo - 2 * DAY, 'Orthodox Good Friday');
      add(eo, 'Orthodox Easter');
      add(eo + DAY, 'Orthodox Easter Monday');
      add(D(4, 1), 'Labour Day');
      add(D(5, 1), 'Children’s Day');
      add(eo + 49 * DAY, 'Orthodox Pentecost');
      add(eo + 50 * DAY, 'Pentecost Monday');
      add(D(7, 15), 'Assumption of Mary');
      add(D(10, 30), 'St Andrew’s Day');
      add(D(11, 1), 'National Day');
      add(D(11, 25), 'Christmas Day');
      add(D(11, 26), 'Second day of Christmas');
      break;
    case 'MD':
      add(D(0, 1), 'New Year’s Day');
      add(D(0, 7), 'Orthodox Christmas');
      add(D(0, 8), 'Orthodox Christmas, second day');
      add(D(2, 8), 'International Women’s Day');
      add(eo, 'Orthodox Easter');
      add(eo + DAY, 'Orthodox Easter Monday');
      add(eo + 8 * DAY, 'Memorial Easter');
      add(D(4, 1), 'Labour Day');
      add(D(4, 9), 'Europe Day and Victory Day');
      add(D(5, 1), 'Children’s Day');
      add(D(7, 27), 'Independence Day');
      add(D(7, 31), 'Romanian Language Day');
      add(D(11, 25), 'Christmas Day');
      break;
    case 'DE':
      add(D(0, 1), 'New Year’s Day');
      add(ew - 2 * DAY, 'Good Friday');
      add(ew + DAY, 'Easter Monday');
      add(D(4, 1), 'Labour Day');
      add(ew + 39 * DAY, 'Ascension Day');
      add(ew + 50 * DAY, 'Whit Monday');
      add(D(9, 3), 'German Unity Day');
      add(D(11, 25), 'Christmas Day');
      add(D(11, 26), 'Second day of Christmas');
      break;
    case 'FR':
      add(D(0, 1), 'New Year’s Day');
      add(ew + DAY, 'Easter Monday');
      add(D(4, 1), 'Labour Day');
      add(D(4, 8), 'Victory in Europe Day');
      add(ew + 39 * DAY, 'Ascension Day');
      add(ew + 50 * DAY, 'Whit Monday');
      add(D(6, 14), 'Bastille Day');
      add(D(7, 15), 'Assumption');
      add(D(10, 1), 'All Saints’ Day');
      add(D(10, 11), 'Armistice Day');
      add(D(11, 25), 'Christmas Day');
      break;
    case 'IT':
      add(D(0, 1), 'New Year’s Day');
      add(D(0, 6), 'Epiphany');
      add(ew, 'Easter Sunday');
      add(ew + DAY, 'Easter Monday');
      add(D(3, 25), 'Liberation Day');
      add(D(4, 1), 'Labour Day');
      add(D(5, 2), 'Republic Day');
      add(D(7, 15), 'Ferragosto');
      if (y >= 2026) add(D(9, 4), 'St Francis of Assisi');
      add(D(10, 1), 'All Saints’ Day');
      add(D(11, 8), 'Immaculate Conception');
      add(D(11, 25), 'Christmas Day');
      add(D(11, 26), 'St Stephen’s Day');
      break;
    case 'ES':
      add(D(0, 1), 'New Year’s Day');
      add(D(0, 6), 'Epiphany');
      add(ew - 2 * DAY, 'Good Friday');
      add(D(4, 1), 'Labour Day');
      add(D(7, 15), 'Assumption');
      add(D(9, 12), 'National Day');
      add(D(10, 1), 'All Saints’ Day');
      add(D(11, 6), 'Constitution Day');
      add(D(11, 8), 'Immaculate Conception');
      add(D(11, 25), 'Christmas Day');
      break;
    case 'PL':
      add(D(0, 1), 'New Year’s Day');
      add(D(0, 6), 'Epiphany');
      add(ew, 'Easter Sunday');
      add(ew + DAY, 'Easter Monday');
      add(D(4, 1), 'Labour Day');
      add(D(4, 3), 'Constitution Day');
      add(ew + 49 * DAY, 'Pentecost');
      add(ew + 60 * DAY, 'Corpus Christi');
      add(D(7, 15), 'Assumption');
      add(D(10, 1), 'All Saints’ Day');
      add(D(10, 11), 'Independence Day');
      if (y >= 2025) add(D(11, 24), 'Christmas Eve');
      add(D(11, 25), 'Christmas Day');
      add(D(11, 26), 'Second day of Christmas');
      break;
    case 'GB-EAW':
      add(D(0, 1), 'New Year’s Day', 'sub');
      add(ew - 2 * DAY, 'Good Friday');
      add(ew + DAY, 'Easter Monday');
      add(nth(4, 1, 1), 'Early May bank holiday');
      add(last(4, 1), 'Spring bank holiday');
      add(last(7, 1), 'Summer bank holiday');
      add(D(11, 25), 'Christmas Day', 'sub');
      add(D(11, 26), 'Boxing Day', 'sub');
      break;
    case 'GB-SCT':
      add(D(0, 1), 'New Year’s Day', 'sub');
      add(D(0, 2), '2nd January', 'sub');
      add(ew - 2 * DAY, 'Good Friday');
      add(nth(4, 1, 1), 'Early May bank holiday');
      add(last(4, 1), 'Spring bank holiday');
      add(nth(7, 1, 1), 'Summer bank holiday');
      add(D(10, 30), 'St Andrew’s Day', 'sub');
      add(D(11, 25), 'Christmas Day', 'sub');
      add(D(11, 26), 'Boxing Day', 'sub');
      break;
    case 'US':
      add(D(0, 1), 'New Year’s Day', 'obs');
      add(nth(0, 1, 3), 'Martin Luther King Jr. Day');
      add(nth(1, 1, 3), 'Washington’s Birthday');
      add(last(4, 1), 'Memorial Day');
      if (y >= 2021) add(D(5, 19), 'Juneteenth', 'obs');
      add(D(6, 4), 'Independence Day', 'obs');
      add(nth(8, 1, 1), 'Labor Day');
      add(nth(9, 1, 2), 'Columbus Day');
      add(D(10, 11), 'Veterans Day', 'obs');
      add(nth(10, 4, 4), 'Thanksgiving Day');
      add(D(11, 25), 'Christmas Day', 'obs');
      break;
  }
  return out;
}

/** 'YYYY-MM-DD' → holiday name(s), joined with ' · ' when two fall on one date. */
export type HolidayMap = Record<string, string>;

const cache = new Map<string, HolidayMap>();

/**
 * Public holidays of a region in a year, with UK substitute days and US
 * observed days applied. Cached per region and year.
 */
export function holidays(c: CountryCode, y: number): HolidayMap {
  const key = `${c}:${y}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const list = rawHolidays(c, y).sort((p, q) => p.t - q.t);
  const map: HolidayMap = {};
  for (const h of list) {
    const k = isoMs(h.t);
    map[k] = map[k] ? `${map[k]} · ${h.name}` : h.name;
  }
  for (const h of list) {
    const g = new Date(h.t).getUTCDay();
    if (g !== 0 && g !== 6) continue;
    if (h.rule === 'sub') {
      // Next weekday that is not already a holiday.
      let t = h.t + DAY;
      for (let n = 0; n < 7; n++) {
        const gg = new Date(t).getUTCDay();
        if (gg !== 0 && gg !== 6 && !map[isoMs(t)]) break;
        t += DAY;
      }
      map[isoMs(t)] = `${h.name} (substitute day)`;
    } else if (h.rule === 'obs') {
      map[isoMs(g === 6 ? h.t - DAY : h.t + DAY)] = `${h.name} (observed)`;
    }
  }
  // US: when next year's Jan 1 is a Saturday, Dec 31 is observed.
  if (c === 'US' && new Date(Date.UTC(y + 1, 0, 1)).getUTCDay() === 6) {
    map[iso(y, 11, 31)] = 'New Year’s Day (observed)';
  }
  cache.set(key, map);
  return map;
}

/** Distinct holiday dates that fall inside the year (observed and substitute days included). */
export function countHolidays(c: CountryCode, y: number): number {
  const ys = String(y);
  return Object.keys(holidays(c, y)).filter((k) => k.slice(0, 4) === ys).length;
}

export function holidayNote(c: CountryCode, y: number, holidaysOn: boolean): string {
  if (!holidaysOn) return 'Turn on to mark public holidays and leave them out of your count.';
  const extra = REGION_CAVEATS[c];
  return `${countHolidays(c, y)} public holidays in ${y}.${extra ? ` ${extra}` : ''}`;
}
