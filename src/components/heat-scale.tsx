import { cn } from '@/lib/utils';

/**
 * The heat map shades a working day by its value: how many days off in a row one day of leave buys
 * there (see valueOf in lib/calendar.ts). A value of 1 gains nothing and stays bare. A regular long
 * weekend, worth 2 or 3 (a Monday or a Friday), takes the faintest step so that it does not crowd the
 * map; bridge days worth 4 and 5 climb the ramp and 6 or more take the hottest step.
 */
export const HEAT_LEVELS = [0, 1, 2, 3, 4] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

export function heatLevel(value: number): HeatLevel {
  if (value <= 1) return 0;
  if (value <= 3) return 1;
  return Math.min(4, value - 2) as HeatLevel;
}

/** Tile and text colours per step, from the --heat-* tokens in index.css (light and dark each have their own ramp). */
export const HEAT_CLASS: Record<HeatLevel, string> = {
  0: '',
  1: 'bg-heat-1 text-heat-1-foreground',
  2: 'bg-heat-2 text-heat-2-foreground',
  3: 'bg-heat-3 text-heat-3-foreground',
  4: 'bg-heat-4 text-heat-4-foreground',
};

const HEAT_LABEL: Record<HeatLevel, string> = { 0: '1', 1: '2–3', 2: '4', 3: '5', 4: '6+' };

/** The scale as a row of labelled swatches, for the header legend. */
export function HeatLegend({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <span>Days off per day of leave</span>
      <span className="flex gap-0.5">
        {HEAT_LEVELS.map((l) => (
          <span
            key={l}
            className={cn('grid h-4 min-w-5 place-items-center rounded-[4px] px-1 text-[10px] leading-none tabular-nums', l === 0 ? 'text-muted-foreground' : HEAT_CLASS[l])}
          >
            {HEAT_LABEL[l]}
          </span>
        ))}
      </span>
    </span>
  );
}
