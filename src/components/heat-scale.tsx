import { cn } from '@/lib/utils';

/**
 * The heat map shades a working day by its value: the days off per day of leave of the best block of leave
 * through it around a public holiday (see bestBlock in lib/calendar.ts), in three steps. Below two and a half,
 * the leave buys too little to show and the day stays bare, as does a regular Monday or Friday with no holiday
 * around; under 4 takes the faintest step, 4 to 5 the middle one and more than 5 the hottest. Weekends and
 * holidays are never shaded: they keep the colours they have in the calendar view.
 */
export const HEAT_LEVELS = [0, 1, 2, 3] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

export function heatLevel(value: number): HeatLevel {
  if (value < 2.5) return 0;
  if (value < 4) return 1;
  if (value <= 5) return 2;
  return 3;
}

/** Tile and text colours per step, from the --heat-* tokens in index.css (light and dark each have their own ramp). */
export const HEAT_CLASS: Record<HeatLevel, string> = {
  0: '',
  1: 'bg-heat-1 text-heat-1-foreground',
  2: 'bg-heat-2 text-heat-2-foreground',
  3: 'bg-heat-3 text-heat-3-foreground',
};

const HEAT_LABEL: Record<HeatLevel, string> = { 0: '', 1: '3', 2: '4–5', 3: '6+' };

/** The scale as a row of labelled swatches, for the header legend. */
export function HeatLegend({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <span>Days off per day of leave</span>
      <span className="flex gap-0.5">
        {HEAT_LEVELS.filter((l) => l > 0).map((l) => (
          <span key={l} className={cn('grid h-4 min-w-5 place-items-center rounded-[4px] px-1 text-[10px] leading-none tabular-nums', HEAT_CLASS[l])}>
            {HEAT_LABEL[l]}
          </span>
        ))}
      </span>
    </span>
  );
}
