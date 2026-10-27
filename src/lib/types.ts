export type CountryCode =
  | 'FR'
  | 'DE'
  | 'IT'
  | 'MD'
  | 'PL'
  | 'RO'
  | 'ES'
  | 'GB-EAW'
  | 'GB-SCT'
  | 'US';

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
  country: CountryCode; // default: guessed from time zone / language
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
