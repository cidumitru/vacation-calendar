import { describe, expect, it, vi } from 'vitest';
import { RO_2026 } from '../__fixtures__/nager';
import { NAGER_BASE, NagerError, fetchAvailableCountries, fetchPublicHolidays, parseCountries, parseHolidays } from '../nager';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('parseHolidays', () => {
  it('keeps well-formed entries and drops malformed ones', () => {
    const raw = [
      ...RO_2026,
      { date: 'not-a-date', name: 'Bad' },
      { date: '2026-03-01' }, // no name
      null,
      { date: '2026-03-02', localName: 'Only local', global: false, counties: [], types: 'Public' },
    ];
    const out = parseHolidays(raw);
    expect(out).toHaveLength(RO_2026.length + 1);
    const last = out[out.length - 1];
    expect(last.name).toBe('Only local');
    expect(last.counties).toBeNull(); // empty list = nationwide
    expect(last.types).toEqual(['Public']); // bad types field falls back to Public
  });

  it('rejects a non-array body', () => {
    expect(() => parseHolidays({ message: 'nope' })).toThrow(NagerError);
  });
});

describe('parseCountries', () => {
  it('sorts by name and drops bad codes', () => {
    const out = parseCountries([
      { countryCode: 'RO', name: 'Romania' },
      { countryCode: 'AD', name: 'Andorra' },
      { countryCode: 'GBX', name: 'Bad' },
    ]);
    expect(out.map((c) => c.countryCode)).toEqual(['AD', 'RO']);
  });
});

describe('fetchPublicHolidays', () => {
  it('requests the v3 endpoint and parses the body', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(RO_2026));
    const out = await fetchPublicHolidays('RO', 2026, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(`${NAGER_BASE}/PublicHolidays/2026/RO`, expect.anything());
    expect(out).toHaveLength(RO_2026.length);
  });

  it('turns a 404 into a NagerError with the status', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 }));
    await expect(fetchPublicHolidays('XX', 2026, fetchImpl)).rejects.toMatchObject({ name: 'NagerError', status: 404 });
  });

  it('turns a network failure into a NagerError without a status', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchPublicHolidays('RO', 2026, fetchImpl)).rejects.toMatchObject({ name: 'NagerError', status: null, message: 'Failed to fetch' });
  });

  it('refuses a malformed country code before hitting the network', async () => {
    const fetchImpl = vi.fn();
    await expect(fetchPublicHolidays('gb-eaw', 2026, fetchImpl)).rejects.toThrow(NagerError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('fetchAvailableCountries', () => {
  it('requests the v3 endpoint', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([{ countryCode: 'RO', name: 'Romania' }]));
    const out = await fetchAvailableCountries(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(`${NAGER_BASE}/AvailableCountries`, expect.anything());
    expect(out).toEqual([{ countryCode: 'RO', name: 'Romania' }]);
  });
});
