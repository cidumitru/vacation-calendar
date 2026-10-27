export type WeekStart = 'Monday' | 'Sunday';

export interface Trip {
  id: string; // 't' + Date.now().toString(36)
  name: string;
  from: string; // 'YYYY-MM-DD', inclusive
  to: string; // 'YYYY-MM-DD', inclusive, >= from, at most 365 days later
  color: string; // one of the four palette solids
}

export interface Settings {
  holidays: boolean; // default true
  country: string; // ISO 3166-1 alpha-2 as Nager.Date lists it, e.g. 'RO'; default: guessed
  region: string | null; // ISO 3166-2 subdivision from Nager's `counties` (e.g. 'GB-SCT'); null = nationwide days only
  weekStart: WeekStart; // default 'Monday'
  allowance: number; // 0–99, default 25
}

export interface Stored {
  trips: Trip[];
  settings: Settings;
}

export interface Draft {
  name: string;
  from: string;
  to: string;
}
