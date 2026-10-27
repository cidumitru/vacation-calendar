// All date maths runs in UTC via Date.UTC; dates are 'YYYY-MM-DD' strings.

export const DAY = 86_400_000;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const pad = (n: number): string => String(n).padStart(2, '0');

/** month is 0-based. */
export const iso = (y: number, m: number, d: number): string => `${y}-${pad(m + 1)}-${pad(d)}`;

/** UTC milliseconds of a 'YYYY-MM-DD' key (NaN for an empty or bad key). */
export function ms(key: string): number {
  const p = String(key || '').split('-');
  return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

export function isoMs(t: number): string {
  const d = new Date(t);
  return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function yearOf(key: string): number {
  return Number(key.slice(0, 4));
}

export function isWeekend(key: string): boolean {
  const g = new Date(ms(key)).getUTCDay();
  return g === 0 || g === 6;
}

/** Calls fn for every day from a to b inclusive (capped at 400 days). */
export function eachDay(a: string, b: string, fn: (key: string) => void): void {
  let t = ms(a);
  const end = ms(b);
  if (Number.isNaN(t) || Number.isNaN(end)) return;
  let guard = 0;
  while (t <= end && guard < 400) {
    fn(isoMs(t));
    t += DAY;
    guard++;
  }
}

export function daysBetween(a: string, b: string): number {
  return (ms(b) - ms(a)) / DAY;
}

/** "Sat 18 Jul", with the year appended when it differs from the year in view. */
export function fmt(key: string, yearInView: number): string {
  const d = new Date(ms(key));
  let out = `${DAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
  if (d.getUTCFullYear() !== yearInView) out += ` ${d.getUTCFullYear()}`;
  return out;
}
