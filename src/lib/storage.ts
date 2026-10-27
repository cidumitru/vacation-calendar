import { isCountryCode } from './holidays';
import type { CountryCode, Settings, Stored, Trip } from './types';

export const STORE_KEY = 'vp-apple-v1';

export const SEED_TRIPS: Trip[] = [
  { id: 'seed0', name: 'Winter break', from: '2026-02-16', to: '2026-02-20', color: '#0A7D8C' },
  { id: 'seed1', name: 'Summer', from: '2026-07-18', to: '2026-08-02', color: '#5856D6' },
  { id: 'seed2', name: 'Long weekend', from: '2026-10-23', to: '2026-10-26', color: '#D6336C' },
];

const BY_TZ: Record<string, CountryCode> = {
  'Europe/Bucharest': 'RO',
  'Europe/Chisinau': 'MD',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Warsaw': 'PL',
  'Europe/London': 'GB-EAW',
};

const BY_LANG: Record<string, CountryCode> = { ro: 'RO', de: 'DE', fr: 'FR', it: 'IT', es: 'ES', pl: 'PL' };

/** Default region: browser time zone first, then language, otherwise RO. */
export function guessCountry(timeZone?: string, language?: string): CountryCode {
  let tz = timeZone ?? '';
  let lang = language ?? '';
  if (timeZone === undefined) {
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { tz = ''; }
  }
  if (language === undefined) {
    try { lang = (typeof navigator !== 'undefined' && navigator.language) || ''; } catch { lang = ''; }
  }
  lang = lang.toLowerCase();
  if (BY_TZ[tz]) return BY_TZ[tz];
  if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky)/.test(tz) || tz === 'Pacific/Honolulu') return 'US';
  if (lang === 'ro-md') return 'MD';
  if (lang === 'en-gb') return 'GB-EAW';
  if (lang === 'en-us') return 'US';
  return BY_LANG[lang.split('-')[0]] ?? 'RO';
}

export function defaultSettings(): Settings {
  return { holidays: true, country: guessCountry(), weekStart: 'Monday', allowance: 25 };
}

function isTrip(v: unknown): v is Trip {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  return typeof t.id === 'string' && typeof t.name === 'string' && typeof t.from === 'string' && typeof t.to === 'string' && typeof t.color === 'string';
}

/** Saved settings are merged over the defaults, so keys added later get their default. */
function mergeSettings(saved: unknown): Settings {
  const d = defaultSettings();
  if (!saved || typeof saved !== 'object') return d;
  const s = saved as Record<string, unknown>;
  return {
    holidays: typeof s.holidays === 'boolean' ? s.holidays : d.holidays,
    country: isCountryCode(s.country) ? s.country : d.country,
    weekStart: s.weekStart === 'Sunday' || s.weekStart === 'Monday' ? s.weekStart : d.weekStart,
    allowance: typeof s.allowance === 'number' && Number.isFinite(s.allowance) ? Math.min(99, Math.max(0, Math.round(s.allowance))) : d.allowance,
  };
}

/** Reads the store once; a missing, corrupt or blocked store falls back to defaults and seeds. */
export function load(): Stored {
  let saved: unknown = null;
  try {
    saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    saved = null;
  }
  const obj = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : null;
  const trips = obj && Array.isArray(obj.trips) ? obj.trips.filter(isTrip) : SEED_TRIPS;
  return { trips, settings: mergeSettings(obj?.settings) };
}

export function save(data: Stored): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Storage blocked or full: the page keeps working from memory.
  }
}
