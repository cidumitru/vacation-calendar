import { describe, expect, it, vi } from 'vitest';
import { RO_2026 } from '../__fixtures__/holidays';
import type { HolidayEngine } from '../holidayEngine';
import { HolidayStore, LOAD_ERROR } from '../holidayStore';

const flush = () => new Promise((r) => setTimeout(r, 0));

function fakeEngine() {
  const holidays = vi.fn((country: string, _region: string | null, year: number) =>
    country === 'RO' ? RO_2026.map((h) => ({ ...h, date: String(year) + h.date.slice(4) })) : undefined,
  );
  const engine: HolidayEngine = {
    countries: () => [{ code: 'RO', name: 'Romania' }],
    regions: (c) => (c === 'GB' ? [{ code: 'GB-SCT', name: 'Scotland' }] : []),
    holidays,
  };
  return { engine, holidays };
}

describe('HolidayStore', () => {
  it('has nothing before load() and everything once the engine is in', async () => {
    const { engine } = fakeEngine();
    const loader = vi.fn(async () => engine);
    const store = new HolidayStore(loader);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.get('RO', null, 2026)).toBeUndefined();
    expect(store.countries()).toBeUndefined();
    expect(store.regions('GB')).toEqual([]);
    expect(store.status()).toEqual({ loaded: false, loading: false, error: null });
    expect(loader).not.toHaveBeenCalled();

    store.load();
    expect(store.status()).toEqual({ loaded: false, loading: true, error: null });
    expect(listener).toHaveBeenCalledTimes(1);
    await flush();
    expect(store.status()).toEqual({ loaded: true, loading: false, error: null });
    expect(store.get('RO', null, 2026)).toHaveLength(RO_2026.length);
    expect(store.countries()).toEqual([{ code: 'RO', name: 'Romania' }]);
    expect(store.regions('GB')).toEqual([{ code: 'GB-SCT', name: 'Scotland' }]);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getVersion()).toBe(2);
  });

  it('loads the engine once, however often load() is called', async () => {
    const loader = vi.fn(async () => fakeEngine().engine);
    const store = new HolidayStore(loader);
    store.load();
    store.load();
    await flush();
    store.load();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('memoises per country, region and year', async () => {
    const { engine, holidays } = fakeEngine();
    const store = new HolidayStore(async () => engine);
    store.load();
    await flush();
    const first = store.get('RO', null, 2026);
    expect(store.get('RO', null, 2026)).toBe(first);
    expect(holidays).toHaveBeenCalledTimes(1);
    expect(store.get('RO', null, 2027)?.[0].date).toBe('2027-01-01');
    store.get('RO', 'RO-X', 2026);
    expect(holidays).toHaveBeenCalledTimes(3);
  });

  it('returns undefined for an unknown country without asking twice', async () => {
    const { engine, holidays } = fakeEngine();
    const store = new HolidayStore(async () => engine);
    store.load();
    await flush();
    expect(store.get('XX', null, 2026)).toBeUndefined();
    expect(store.get('XX', null, 2026)).toBeUndefined();
    expect(holidays).toHaveBeenCalledTimes(1);
  });

  it('records a failed load, does not retry on its own, and retries on demand', async () => {
    let fail = true;
    const loader = vi.fn(async () => {
      if (fail) throw new TypeError('Failed to fetch dynamically imported module');
      return fakeEngine().engine;
    });
    const store = new HolidayStore(loader);
    store.load();
    await flush();
    expect(store.status()).toEqual({ loaded: false, loading: false, error: LOAD_ERROR });
    store.load();
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);

    fail = false;
    store.retry();
    expect(store.status()).toMatchObject({ loading: true, error: null });
    await flush();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(store.status()).toEqual({ loaded: true, loading: false, error: null });
    expect(store.get('RO', null, 2026)).toHaveLength(RO_2026.length);
  });
});
