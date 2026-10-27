// Thin client for the Nager.Date public holiday API (https://date.nager.at).
// GET /api/v3/PublicHolidays/{year}/{countryCode} and GET /api/v3/AvailableCountries.

export const NAGER_BASE = 'https://date.nager.at/api/v3';

export interface NagerHoliday {
  date: string; // 'YYYY-MM-DD'
  localName: string;
  name: string;
  countryCode: string;
  global: boolean; // true = applies to the whole country
  counties: string[] | null; // ISO 3166-2 codes the holiday is limited to, when not global
  launchYear: number | null;
  types: string[]; // Public, Bank, School, Authorities, Optional, Observance
}

export interface NagerCountry {
  countryCode: string;
  name: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class NagerError extends Error {
  constructor(message: string, public readonly status: number | null) {
    super(message);
    this.name = 'NagerError';
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/** Keeps only well-formed entries; unknown extra fields are dropped. */
export function parseHolidays(raw: unknown): NagerHoliday[] {
  if (!Array.isArray(raw)) throw new NagerError('Unexpected response shape', null);
  const out: NagerHoliday[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const h = item as Record<string, unknown>;
    if (typeof h.date !== 'string' || !DATE_RE.test(h.date)) continue;
    const name = typeof h.name === 'string' ? h.name : typeof h.localName === 'string' ? h.localName : '';
    if (!name) continue;
    out.push({
      date: h.date,
      localName: typeof h.localName === 'string' ? h.localName : name,
      name,
      countryCode: typeof h.countryCode === 'string' ? h.countryCode : '',
      global: h.global !== false, // missing = nationwide
      counties: isStringArray(h.counties) && h.counties.length ? h.counties : null,
      launchYear: typeof h.launchYear === 'number' ? h.launchYear : null,
      types: isStringArray(h.types) ? h.types : ['Public'],
    });
  }
  return out;
}

export function parseCountries(raw: unknown): NagerCountry[] {
  if (!Array.isArray(raw)) throw new NagerError('Unexpected response shape', null);
  const out: NagerCountry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    if (typeof c.countryCode !== 'string' || !COUNTRY_RE.test(c.countryCode) || typeof c.name !== 'string') continue;
    out.push({ countryCode: c.countryCode, name: c.name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

async function getJson(url: string, fetchImpl: FetchLike): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new NagerError(e instanceof Error && e.message ? e.message : 'Network error', null);
  }
  if (!res.ok) {
    const what = res.status === 404 ? 'No data for that country' : `HTTP ${res.status}`;
    throw new NagerError(what, res.status);
  }
  try {
    return await res.json();
  } catch {
    throw new NagerError('Invalid JSON', res.status);
  }
}

export async function fetchPublicHolidays(country: string, year: number, fetchImpl: FetchLike = fetch): Promise<NagerHoliday[]> {
  if (!COUNTRY_RE.test(country)) throw new NagerError(`Bad country code “${country}”`, null);
  return parseHolidays(await getJson(`${NAGER_BASE}/PublicHolidays/${year}/${country}`, fetchImpl));
}

export async function fetchAvailableCountries(fetchImpl: FetchLike = fetch): Promise<NagerCountry[]> {
  return parseCountries(await getJson(`${NAGER_BASE}/AvailableCountries`, fetchImpl));
}
