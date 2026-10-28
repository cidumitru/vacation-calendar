import { cn } from '@/lib/utils';

/**
 * The heat map shades a day by its value: the days off per day of leave of the best block of leave
 * through it, or covering it, around a public holiday (see bestBlock in lib/calendar.ts). Below two and a
 * half, the leave buys too little to show and the day stays bare, as does a regular Monday or Friday with
 * no holiday around; up to 3 takes the faintest step, up to 4 and up to 5 climb the ramp and more than 5
 * takes the hottest step.
 */
export const HEAT_LEVELS = [0, 1, 2, 3, 4] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

export function heatLevel(value: number): HeatLevel {
  if (value < 2.5) return 0;
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

/** The same steps for the weekends and holidays inside a break: darker and duller, so the days to take stand out from the days already free. */
export const HEAT_FREE_CLASS: Record<HeatLevel, string> = {
  0: '',
  1: 'bg-heat-1-free text-heat-1-free-foreground',
  2: 'bg-heat-2-free text-heat-2-free-foreground',
  3: 'bg-heat-3-free text-heat-3-free-foreground',
  4: 'bg-heat-4-free text-heat-4-free-foreground',
};

const HEAT_LABEL: Record<HeatLevel, string> = { 0: '', 1: '3', 2: '4', 3: '5', 4: '6+' };

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
