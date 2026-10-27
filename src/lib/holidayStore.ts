// Caches Nager.Date responses in memory and in localStorage, deduplicates in-flight
// requests and serves stale entries while refreshing them in the background.

import { NagerError, fetchAvailableCountries, fetchPublicHolidays, type FetchLike, type NagerCountry, type NagerHoliday } from './nager';

export const HOLIDAYS_STORE_KEY = 'vp-holidays-v1';
export const COUNTRIES_STORE_KEY = 'vp-countries-v1';
export const MAX_AGE_MS = 30 * 86_400_000; // refresh an entry after 30 days
export const MAX_ENTRIES = 200; // country-years kept in localStorage

interface Entry<T> {
  data: T;
  fetchedAt: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

interface Options {
  fetchImpl?: FetchLike;
  storage?: StorageLike | null;
  now?: () => number;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export class HolidayStore {
  private holidays = new Map<string, Entry<NagerHoliday[]>>();
  private countries: Entry<NagerCountry[]> | null = null;
  private inflight = new Set<string>();
  private errors = new Map<string, string>();
  private listeners = new Set<() => void>();
  private version = 0;
  private loadedFromStorage = false;
  private readonly fetchImpl: FetchLike;
  private readonly storage: StorageLike | null;
  private readonly now: () => number;

  constructor(opts: Options = {}) {
    this.fetchImpl = opts.fetchImpl ?? ((input, init) => fetch(input, init));
    this.storage = opts.storage === undefined ? defaultStorage() : opts.storage;
    this.now = opts.now ?? (() => Date.now());
  }

  // ---- subscription (useSyncExternalStore-compatible)
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  private bump(): void {
    this.version++;
    for (const l of this.listeners) l();
  }

  // ---- holidays
  private key(country: string, year: number): string {
    return `${country}:${year}`;
  }

  /** The raw Nager list for a country-year, or undefined while nothing is loaded. */
  get(country: string, year: number): NagerHoliday[] | undefined {
    this.hydrate();
    return this.holidays.get(this.key(country, year))?.data;
  }

  status(country: string, year: number): LoadStatus {
    this.hydrate();
    const k = this.key(country, year);
    return { loaded: this.holidays.has(k), loading: this.inflight.has(k), error: this.errors.get(k) ?? null };
  }

  /** Fetches when missing or older than MAX_AGE_MS; a failed fetch waits for retry(). */
  ensure(country: string, year: number): void {
    this.hydrate();
    const k = this.key(country, year);
    const entry = this.holidays.get(k);
    if (entry && this.now() - entry.fetchedAt < MAX_AGE_MS) return;
    if (this.inflight.has(k) || this.errors.has(k)) return;
    void this.load(country, year);
  }

  retry(country: string, year: number): void {
    const k = this.key(country, year);
    this.errors.delete(k);
    if (!this.inflight.has(k)) void this.load(country, year);
  }

  private async load(country: string, year: number): Promise<void> {
    const k = this.key(country, year);
    this.inflight.add(k);
    this.bump();
    try {
      const data = await fetchPublicHolidays(country, year, this.fetchImpl);
      this.holidays.set(k, { data, fetchedAt: this.now() });
      this.errors.delete(k);
      this.persistHolidays();
    } catch (e) {
      this.errors.set(k, e instanceof NagerError ? e.message : 'Network error');
    } finally {
      this.inflight.delete(k);
      this.bump();
    }
  }

  // ---- countries
  getCountries(): NagerCountry[] | undefined {
    this.hydrate();
    return this.countries?.data;
  }

  countriesStatus(): LoadStatus {
    this.hydrate();
    return { loaded: !!this.countries, loading: this.inflight.has('countries'), error: this.errors.get('countries') ?? null };
  }

  ensureCountries(): void {
    this.hydrate();
    if (this.countries && this.now() - this.countries.fetchedAt < MAX_AGE_MS) return;
    if (this.inflight.has('countries') || this.errors.has('countries')) return;
    void this.loadCountries();
  }

  retryCountries(): void {
    this.errors.delete('countries');
    if (!this.inflight.has('countries')) void this.loadCountries();
  }

  private async loadCountries(): Promise<void> {
    this.inflight.add('countries');
    this.bump();
    try {
      const data = await fetchAvailableCountries(this.fetchImpl);
      this.countries = { data, fetchedAt: this.now() };
      this.errors.delete('countries');
      this.write(COUNTRIES_STORE_KEY, this.countries);
    } catch (e) {
      this.errors.set('countries', e instanceof NagerError ? e.message : 'Network error');
    } finally {
      this.inflight.delete('countries');
      this.bump();
    }
  }

  // ---- localStorage
  private hydrate(): void {
    if (this.loadedFromStorage) return;
    this.loadedFromStorage = true;
    const h = this.read(HOLIDAYS_STORE_KEY) as { entries?: Record<string, Entry<unknown>> } | null;
    if (h && h.entries && typeof h.entries === 'object') {
      for (const [k, e] of Object.entries(h.entries)) {
        if (e && Array.isArray(e.data) && typeof e.fetchedAt === 'number') this.holidays.set(k, e as Entry<NagerHoliday[]>);
      }
    }
    const c = this.read(COUNTRIES_STORE_KEY) as Entry<unknown> | null;
    if (c && Array.isArray(c.data) && typeof c.fetchedAt === 'number') this.countries = c as Entry<NagerCountry[]>;
  }

  private persistHolidays(): void {
    const entries = [...this.holidays.entries()].sort((a, b) => b[1].fetchedAt - a[1].fetchedAt).slice(0, MAX_ENTRIES);
    this.write(HOLIDAYS_STORE_KEY, { entries: Object.fromEntries(entries) });
  }

  private read(key: string): unknown {
    if (!this.storage) return null;
    try {
      return JSON.parse(this.storage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked or full: the in-memory cache still works.
    }
  }
}

export const holidayStore = new HolidayStore();
