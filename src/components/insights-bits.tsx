// Pieces the insights dialog's content shares: the props it takes, the heat-coloured value badge, the wording of a
// break and the note that stands in for the suggestions while there are none.

import { HEAT_CLASS, heatLevel } from '@/components/heat-scale';
import { fmt } from '@/lib/dates';
import type { YearModel } from '@/lib/calendar';
import type { LoadStatus } from '@/lib/holidayStore';
import type { Suggestion, YearInsights } from '@/lib/insights';
import type { WeekStart } from '@/lib/types';
import { cn, plural } from '@/lib/utils';

export { plural };

export interface InsightsViewProps {
  insights: YearInsights;
  model: YearModel;
  allowance: number;
  holidaysOn: boolean;
  status: LoadStatus;
  /** Today's 'YYYY-MM-DD', for the year map. */
  today: string;
  weekStart: WeekStart;
  /** Adds the breaks as trips, in one go. */
  onAdd: (picks: Suggestion[]) => void;
  /** Scrolls the calendar to a month (0-based) of the year in view. */
  onJumpMonth: (month: number) => void;
}

/** "7" or "3.7": the days off per day of leave, one decimal when it is not whole. */
export const fmtValue = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** "Thu 1 – Wed 7 Jan": the break a block buys. */
export const breakRange = (s: Suggestion, year: number): string => `${fmt(s.start, year)} – ${fmt(s.end, year)}`;

/** "Mon 5 Jan" or "Mon 5 – Fri 9 Jan": the days of leave. */
export const leaveRange = (s: Suggestion, year: number): string => (s.from === s.to ? fmt(s.from, year) : `${fmt(s.from, year)} – ${fmt(s.to, year)}`);

/** Days off per day of leave on the heat map's colour for that value. */
export function ValueBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn('grid h-6 min-w-9 shrink-0 place-items-center rounded-md px-1.5 text-xs font-semibold tabular-nums', HEAT_CLASS[heatLevel(value)] || 'bg-muted text-muted-foreground', className)}
      aria-label={`${fmtValue(value)} days off per day of leave`}
    >
      {fmtValue(value)}×
    </span>
  );
}

/** Why there are no suggestions to show, or null when there are. */
export function suggestionNote(p: InsightsViewProps): string | null {
  if (!p.holidaysOn) return 'Public holidays are off. Turn them on in Settings and the breaks worth taking around them show here.';
  if (!p.status.loaded && p.status.loading) return 'Loading public holidays…';
  if (!p.status.loaded && p.status.error) return `Couldn’t load public holidays for ${p.insights.year}: ${p.status.error}.`;
  if (p.insights.clusters.length === 0) return `No public holiday in ${p.insights.year} falls where a few days of leave would buy a long break.`;
  return null;
}
