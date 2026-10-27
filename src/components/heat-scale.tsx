import { cn } from '@/lib/utils';

/**
 * The heat map shades a working day by its value: how many days off in a row one day of leave buys
 * there (see valueOf in lib/calendar.ts). Five steps: a value of 1 gains nothing and takes the neutral
 * tile, 2 to 4 climb the ramp and 5 or more take the hottest step.
 */
export const HEAT_LEVELS = [0, 1, 2, 3, 4] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

export function heatLevel(value: number): HeatLevel {
  return Math.min(4, Math.max(0, value - 1)) as HeatLevel;
}

/** Tile and text colours per step, from the --heat-* tokens in index.css (light and dark each have their own ramp). */
export const HEAT_CLASS: Record<HeatLevel, string> = {
  0: 'bg-muted text-foreground',
  1: 'bg-heat-1 text-heat-1-foreground',
  2: 'bg-heat-2 text-heat-2-foreground',
  3: 'bg-heat-3 text-heat-3-foreground',
  4: 'bg-heat-4 text-heat-4-foreground',
};

const HEAT_LABEL: Record<HeatLevel, string> = { 0: '1', 1: '2', 2: '3', 3: '4', 4: '5+' };

/** The scale as a row of labelled swatches, for the header legend. */
export function HeatLegend({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <span>Days off per day of leave</span>
      <span className="flex gap-0.5">
        {HEAT_LEVELS.map((l) => (
          <span key={l} className={cn('grid h-4 w-5 place-items-center rounded-[4px] text-[10px] leading-none tabular-nums', HEAT_CLASS[l])}>
            {HEAT_LABEL[l]}
          </span>
        ))}
      </span>
    </span>
  );
}
