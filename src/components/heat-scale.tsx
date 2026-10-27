import { cn } from '@/lib/utils';

/**
 * The heat map shades a working day by its value: the days off per day of leave of the best block of
 * leave through it (see bestBlock in lib/calendar.ts). Up to 2 gains nothing worth showing and stays
 * bare; a regular long weekend, worth 3 (a Monday or a Friday), takes the faintest step so that it does
 * not crowd the map; up to 4 and up to 5 climb the ramp and more than 5 takes the hottest step.
 */
export const HEAT_LEVELS = [0, 1, 2, 3, 4] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

export function heatLevel(value: number): HeatLevel {
  if (value <= 2) return 0;
  if (value <= 3) return 1;
  if (value <= 4) return 2;
  if (value <= 5) return 3;
  return 4;
}

/** Tile and text colours per step, from the --heat-* tokens in index.css (light and dark each have their own ramp). */
export const HEAT_CLASS: Record<HeatLevel, string> = {
  0: '',
  1: 'bg-heat-1 text-heat-1-foreground',
  2: 'bg-heat-2 text-heat-2-foreground',
  3: 'bg-heat-3 text-heat-3-foreground',
  4: 'bg-heat-4 text-heat-4-foreground',
};

const HEAT_LABEL: Record<HeatLevel, string> = { 0: '≤2', 1: '3', 2: '4', 3: '5', 4: '6+' };

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
