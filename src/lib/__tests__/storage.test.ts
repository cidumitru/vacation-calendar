import { describe, expect, it } from 'vitest';
import { STALE_KEYS, STORE_KEY, guessCountry, load, mergeSettings, save } from '../storage';

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

describe('Default country', () => {
  it('prefers the time zone, then the language, then RO', () => {
    expect(guessCountry('Europe/Bucharest', 'en-US')).toBe('RO');
    expect(guessCountry('Europe/London', 'ro')).toBe('GB');
    expect(guessCountry('America/New_York', 'fr')).toBe('US');
    expect(guessCountry('Pacific/Honolulu', '')).toBe('US');
    expect(guessCountry('Asia/Tokyo', 'ro-MD')).toBe('MD');
    expect(guessCountry('Asia/Tokyo', 'en-GB')).toBe('GB');
    expect(guessCountry('Asia/Tokyo', 'de-AT')).toBe('AT');
    expect(guessCountry('Asia/Tokyo', 'de')).toBe('DE');
    expect(guessCountry('Asia/Tokyo', 'en')).toBe('US');
    expect(guessCountry('Asia/Tokyo', '')).toBe('RO');
  });
});

describe('Settings merge and migration', () => {
  it('migrates the first release’s UK codes to a country plus region', () => {
    expect(mergeSettings({ country: 'GB-EAW' })).toMatchObject({ country: 'GB', region: 'GB-ENG' });
    expect(mergeSettings({ country: 'GB-SCT' })).toMatchObject({ country: 'GB', region: 'GB-SCT' });
    expect(mergeSettings({ country: 'MD' })).toMatchObject({ country: 'MD', region: null });
  });

  it('keeps a region only when it belongs to the country', () => {
    expect(mergeSettings({ country: 'DE', region: 'DE-BY' }).region).toBe('DE-BY');
    expect(mergeSettings({ country: 'DE', region: 'GB-SCT' }).region).toBeNull();
    expect(mergeSettings({ country: 'DE', region: 'bavaria' }).region).toBeNull();
    expect(mergeSettings({ country: 'CK', region: 'CK-Aitutaki' }).region).toBe('CK-Aitutaki'); // subdivisions are not always short codes
  });

  it('fills missing keys with defaults and clamps the allowance', () => {
    const s = mergeSettings({ allowance: 150, weekStart: 'Friday' });
    expect(s.allowance).toBe(99);
    expect(s.weekStart).toBe('Monday');
    expect(s.holidays).toBe(true);
    expect(s.view).toBe('calendar');
  });

  it('keeps the heat map view and drops an unknown one', () => {
    expect(mergeSettings({ view: 'heatmap' }).view).toBe('heatmap');
    expect(mergeSettings({ view: 'table' }).view).toBe('calendar');
  });
});

describe('load / save', () => {
  it('forgets the holiday cache of earlier releases', () => {
    const storage = new MemoryStorage();
    for (const k of STALE_KEYS) storage.setItem(k, '{}');
    storage.setItem('vp-theme', 'dark');
    load(storage);
    for (const k of STALE_KEYS) expect(storage.map.has(k)).toBe(false);
    expect(storage.map.get('vp-theme')).toBe('dark');
  });

  it('round-trips trips and settings and falls back to seeds', () => {
    const storage = new MemoryStorage();
    const first = load(storage);
    expect(first.trips).toHaveLength(3);
    save({ trips: [], settings: { ...first.settings, allowance: 30 } }, storage);
    const second = load(storage);
    expect(second.trips).toEqual([]);
    expect(second.settings.allowance).toBe(30);
    storage.setItem(STORE_KEY, '{corrupt');
    expect(load(storage).trips).toHaveLength(3);
  });
});
