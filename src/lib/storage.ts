import type { Settings, Stored, Trip } from './types';

export const STORE_KEY = 'vp-apple-v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const SEED_TRIPS: Trip[] = [
  { id: 'seed0', name: 'Winter break', from: '2026-02-16', to: '2026-02-20', color: '#0A7D8C' },
  { id: 'seed1', name: 'Summer', from: '2026-07-18', to: '2026-08-02', color: '#5856D6' },
  { id: 'seed2', name: 'Long weekend', from: '2026-10-23', to: '2026-10-26', color: '#D6336C' },
];

export const COUNTRY_RE = /^[A-Z]{2}$/;
export const REGION_RE = /^[A-Z]{2}-[A-Za-z0-9]{1,16}$/; // '<country>-<subdivision>' as the holiday rules list it

const BY_TZ: Record<string, string> = {
  'Europe/Bucharest': 'RO',
  'Europe/Chisinau': 'MD',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Warsaw': 'PL',
  'Europe/London': 'GB',
};

/** The browser's own locale data (CLDR likely subtags) turns 'ro' into RO, 'en' into US, 'de-AT' into AT. */
function regionOfLanguage(lang: string): string | null {
  if (!lang) return null;
  try {
    const r = new Intl.Locale(lang).maximize().region;
    return r && COUNTRY_RE.test(r) ? r : null;
  } catch {
    return null;
  }
}

/** Default country (ISO 3166-1 alpha-2): browser time zone first, then language, otherwise RO. */
export function guessCountry(timeZone?: string, language?: string): string {
  let tz = timeZone ?? '';
  let lang = language ?? '';
  if (timeZone === undefined) {
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { tz = ''; }
  }
  if (language === undefined) {
    try { lang = (typeof navigator !== 'undefined' && navigator.language) || ''; } catch { lang = ''; }
  }
  if (BY_TZ[tz]) return BY_TZ[tz];
  if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky)/.test(tz) || tz === 'Pacific/Honolulu') return 'US';
  return regionOfLanguage(lang) ?? 'RO';
}

export function defaultSettings(): Settings {
  return { holidays: true, country: guessCountry(), region: null, weekStart: 'Monday', allowance: 25, view: 'calendar' };
}

function isTrip(v: unknown): v is Trip {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  return typeof t.id === 'string' && typeof t.name === 'string' && typeof t.from === 'string' && typeof t.to === 'string' && typeof t.color === 'string';
}

/** Region codes from the first release, which had a fixed list of regions instead of a country and a region. */
const LEGACY_COUNTRIES: Record<string, { country: string; region: string | null }> = {
  'GB-EAW': { country: 'GB', region: 'GB-ENG' },
  'GB-SCT': { country: 'GB', region: 'GB-SCT' },
};

/** Saved settings are merged over the defaults, so keys added later get their default. */
export function mergeSettings(saved: unknown): Settings {
  const d = defaultSettings();
  if (!saved || typeof saved !== 'object') return d;
  const s = saved as Record<string, unknown>;
  let country = d.country;
  let region: string | null = d.region;
  if (typeof s.country === 'string') {
    const legacy = LEGACY_COUNTRIES[s.country];
    if (legacy) ({ country, region } = legacy);
    else if (COUNTRY_RE.test(s.country)) country = s.country;
  }
  if (typeof s.region === 'string' && REGION_RE.test(s.region) && s.region.startsWith(country)) region = s.region;
  else if (s.region === null) region = null;
  return {
    holidays: typeof s.holidays === 'boolean' ? s.holidays : d.holidays,
    country,
    region,
    weekStart: s.weekStart === 'Sunday' || s.weekStart === 'Monday' ? s.weekStart : d.weekStart,
    allowance: typeof s.allowance === 'number' && Number.isFinite(s.allowance) ? Math.min(99, Math.max(0, Math.round(s.allowance))) : d.allowance,
    view: s.view === 'heatmap' || s.view === 'calendar' ? s.view : d.view,
  };
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Keys of the holiday cache earlier releases kept; holidays are computed locally now. */
export const STALE_KEYS = ['vp-holidays-v1', 'vp-countries-v1'];

/** Reads the store once; a missing, corrupt or blocked store falls back to defaults and seeds. */
export function load(storage: StorageLike | null = defaultStorage()): Stored {
  let saved: unknown = null;
  try {
    saved = JSON.parse(storage?.getItem(STORE_KEY) || 'null');
    for (const k of STALE_KEYS) storage?.removeItem?.(k);
  } catch {
    saved = null;
  }
  const obj = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : null;
  const trips = obj && Array.isArray(obj.trips) ? obj.trips.filter(isTrip) : SEED_TRIPS;
  return { trips, settings: mergeSettings(obj?.settings) };
}

export function save(data: Stored, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Storage blocked or full: the page keeps working from memory.
  }
}
