// Serves public holidays computed in the browser (see holidayEngine). Nothing is fetched from a
// server: the engine, the rules for 200+ countries at about 250 KB gzipped, is loaded once as its
// own chunk so the calendar paints first, and results are memoised per country, region and year.

import type { HolidayEngine } from './holidayEngine';
import type { Country, Holiday, Region } from './holidays';

export interface LoadStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

export type EngineLoader = () => Promise<HolidayEngine>;

export const LOAD_ERROR = 'the holiday rules did not download';

const loadDefault: EngineLoader = () => import('./holidayEngine').then((m) => m.createEngine());

export class HolidayStore {
  private engine: HolidayEngine | null = null;
  private loading = false;
  private error: string | null = null;
  private memo = new Map<string, Holiday[] | null>();
  private listeners = new Set<() => void>();
  private version = 0;

  constructor(private readonly loadEngine: EngineLoader = loadDefault) {}

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

  // ---- the engine
  /** Loads the engine once; no-op while it loads or once it has. A failed load waits for retry(). */
  load(): void {
    if (this.engine || this.loading || this.error) return;
    void this.run();
  }

  retry(): void {
    this.error = null;
    this.load();
  }

  private async run(): Promise<void> {
    this.loading = true;
    this.bump();
    try {
      this.engine = await this.loadEngine();
    } catch {
      this.error = LOAD_ERROR;
    } finally {
      this.loading = false;
      this.bump();
    }
  }

  status(): LoadStatus {
    return { loaded: !!this.engine, loading: this.loading, error: this.error };
  }

  // ---- data, all synchronous once the engine is in
  /** The holidays of a country (and region) in a year; undefined while the engine loads or for an unknown country. */
  get(country: string, region: string | null, year: number): Holiday[] | undefined {
    if (!this.engine) return undefined;
    const k = `${country}|${region ?? ''}|${year}`;
    let list = this.memo.get(k);
    if (list === undefined) {
      list = this.engine.holidays(country, region, year) ?? null;
      this.memo.set(k, list);
    }
    return list ?? undefined;
  }

  /** Every country with data, sorted by name; undefined while the engine loads. */
  countries(): Country[] | undefined {
    return this.engine?.countries();
  }

  /** The regions of a country whose holidays differ by region; [] while the engine loads or when there are none. */
  regions(country: string): Region[] {
    return this.engine?.regions(country) ?? [];
  }
}

export const holidayStore = new HolidayStore();
