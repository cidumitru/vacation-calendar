export type WeekStart = 'Monday' | 'Sunday';

/** How the calendar draws its days: trip bands, or a heat map of how many days off in a row one day of leave buys. */
export type CalendarView = 'calendar' | 'heatmap';

export interface Trip {
  id: string; // 't' + Date.now().toString(36)
  name: string;
  from: string; // 'YYYY-MM-DD', inclusive
  to: string; // 'YYYY-MM-DD', inclusive, >= from, at most 365 days later
  color: string; // one of the four palette solids
}

export interface Settings {
  holidays: boolean; // default true
  country: string; // ISO 3166-1 alpha-2 as the holiday rules list it, e.g. 'RO'; default: guessed
  region: string | null; // '<country>-<subdivision>' as the rules list it (e.g. 'GB-SCT'); null = nationwide days only
  weekStart: WeekStart; // default 'Monday'
  allowance: number; // 0–99, default 25
  view: CalendarView; // default 'calendar'
}

export interface Stored {
  trips: Trip[];
  settings: Settings;
}

/** The trip being made or changed in the form. */
export interface Draft {
  /** The id of the trip being changed, or '' for a new one. */
  id: string;
  name: string;
  from: string;
  to: string;
}
