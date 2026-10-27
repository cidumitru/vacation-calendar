import { describe, expect, it, vi } from 'vitest';
import { COUNTRIES, GB_2026, RO_2026 } from '../__fixtures__/nager';
import { COUNTRIES_STORE_KEY, HOLIDAYS_STORE_KEY, HolidayStore, MAX_AGE_MS, MAX_ENTRIES } from '../holidayStore';

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const flush = () => new Promise((r) => setTimeout(r, 0));

function fakeFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (url: string) => {
    if (url.endsWith('/AvailableCountries')) return json(COUNTRIES);
    const m = /PublicHolidays\/(\d{4})\/([A-Z]{2})$/.exec(url);
    if (!m) return new Response('', { status: 404 });
    if (m[2] === 'RO') return json(RO_2026.map((h) => ({ ...h, date: m[1] + h.date.slice(4) })));
    if (m[2] === 'GB') return json(GB_2026);
    return new Response('', { status: 404 });
  });
}

describe('HolidayStore', () => {
  it('fetches on ensure, notifies subscribers and serves from memory afterwards', async () => {
    const fetchImpl = fakeFetch();
    const store = new HolidayStore({ fetchImpl, storage: null });
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.get('RO', 2026)).toBeUndefined();
    store.ensure('RO', 2026);
    expect(store.status('RO', 2026).loading).toBe(true);
    await flush();
    expect(store.get('RO', 2026)).toHaveLength(RO_2026.length);
    expect(store.status('RO', 2026)).toEqual({ loaded: true, loading: false, error: null });
    expect(listener).toHaveBeenCalled();
    store.ensure('RO', 2026);
    store.ensure('RO', 2026);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests for the same country-year', async () => {
    const fetchImpl = fakeFetch();
    const store = new HolidayStore({ fetchImpl, storage: null });
    store.ensure('RO', 2026);
    store.ensure('RO', 2026);
    store.ensure('RO', 2027);
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('persists to storage and a new store hydrates from it without fetching', async () => {
    const storage = new MemoryStorage();
    const first = new HolidayStore({ fetchImpl: fakeFetch(), storage });
    first.ensure('GB', 2026);
    first.ensureCountries();
    await flush();
    expect(storage.map.has(HOLIDAYS_STORE_KEY)).toBe(true);
    expect(storage.map.has(COUNTRIES_STORE_KEY)).toBe(true);

    const fetchImpl = fakeFetch();
    const second = new HolidayStore({ fetchImpl, storage });
    expect(second.get('GB', 2026)).toHaveLength(GB_2026.length);
    expect(second.getCountries()?.map((c) => c.countryCode)).toContain('RO');
    second.ensure('GB', 2026);
    second.ensureCountries();
    await flush();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('serves a stale entry at once and refreshes it in the background', async () => {
    const storage = new MemoryStorage();
    let now = 1_000_000;
    const first = new HolidayStore({ fetchImpl: fakeFetch(), storage, now: () => now });
    first.ensure('RO', 2026);
    await flush();

    now += MAX_AGE_MS + 1;
    const fetchImpl = fakeFetch();
    const second = new HolidayStore({ fetchImpl, storage, now: () => now });
    expect(second.get('RO', 2026)).toHaveLength(RO_2026.length); // stale copy is still served
    second.ensure('RO', 2026);
    expect(second.status('RO', 2026)).toMatchObject({ loaded: true, loading: true });
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.map.get(HOLIDAYS_STORE_KEY)!).entries['RO:2026'].fetchedAt).toBe(now);
  });

  it('records an error, does not retry on its own, and retries on demand', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 }));
    const store = new HolidayStore({ fetchImpl, storage: null });
    store.ensure('XX', 2026);
    await flush();
    expect(store.status('XX', 2026)).toEqual({ loaded: false, loading: false, error: 'No data for that country' });
    store.ensure('XX', 2026);
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    store.retry('XX', 2026);
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed refresh from wiping the saved copy', async () => {
    const storage = new MemoryStorage();
    let now = 1_000_000;
    const first = new HolidayStore({ fetchImpl: fakeFetch(), storage, now: () => now });
    first.ensure('RO', 2026);
    await flush();
    now += MAX_AGE_MS + 1;
    const failing = vi.fn(async () => {
      throw new TypeError('offline');
    });
    const second = new HolidayStore({ fetchImpl: failing, storage, now: () => now });
    second.ensure('RO', 2026);
    await flush();
    expect(second.get('RO', 2026)).toHaveLength(RO_2026.length);
    expect(second.status('RO', 2026)).toEqual({ loaded: true, loading: false, error: 'offline' });
  });

  it('caps the entries written to storage', async () => {
    const storage = new MemoryStorage();
    let now = 0;
    const store = new HolidayStore({ fetchImpl: fakeFetch(), storage, now: () => ++now });
    for (let y = 1900; y < 1900 + MAX_ENTRIES + 20; y++) store.ensure('RO', y);
    await flush();
    const saved = JSON.parse(storage.map.get(HOLIDAYS_STORE_KEY)!);
    expect(Object.keys(saved.entries)).toHaveLength(MAX_ENTRIES);
    expect(saved.entries['RO:1900']).toBeUndefined(); // oldest dropped
    expect(saved.entries[`RO:${1900 + MAX_ENTRIES + 19}`]).toBeDefined();
  });

  it('ignores a corrupt store', () => {
    const storage = new MemoryStorage();
    storage.setItem(HOLIDAYS_STORE_KEY, '{not json');
    storage.setItem(COUNTRIES_STORE_KEY, '42');
    const store = new HolidayStore({ fetchImpl: fakeFetch(), storage });
    expect(store.get('RO', 2026)).toBeUndefined();
    expect(store.getCountries()).toBeUndefined();
  });
});
