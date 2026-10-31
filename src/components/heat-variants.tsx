// PROTOTYPES: three ways to draw the heat map, picked with ?heat=dots|bands|tiers in the URL; without it the current
// drawing stays. Each takes the same day cells as the calendar view and differs only in what it inks:
//   dots  · the calendar as it is, plus one to three dots under a working day worth taking off (3, 4–5, 6+ days off per day of leave)
//   bands · a break worth taking is a light band over its whole span, the trip-band language; the days to book inside it
//           are solid circles, darker for a bridge day (four or more days off for the one day); holidays stay red, weekends grey
//   tiers · the current tiles, but only on working days and in three steps; weekends and holidays keep their own colours
import type { CSSProperties } from 'react';
import { HEAT_CLASS, heatLevel } from '@/components/heat-scale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DayCell, DayKind } from '@/lib/calendar';
import { fmt, yearOf } from '@/lib/dates';
import { cn } from '@/lib/utils';

export type HeatStyle = 'current' | 'dots' | 'bands' | 'tiers';

export const HEAT_STYLE: HeatStyle = (() => {
  const v = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('heat') : null;
  return v === 'dots' || v === 'bands' || v === 'tiers' ? v : 'current';
})();

/** Three steps in place of four: 1 for 3 days off per day of leave, 2 for 4 to 5, 3 for 6 or more; 0 below two and a half. */
export type Tier = 0 | 1 | 2 | 3;
export function tierOf(value: number): Tier {
  const l = heatLevel(value);
  return l === 0 ? 0 : l === 1 ? 1 : l === 4 ? 3 : 2;
}
const TIER_CLASS: Record<Tier, string> = { 0: '', 1: HEAT_CLASS[1], 2: HEAT_CLASS[2], 3: HEAT_CLASS[4] };
const TIER_LABEL: Record<Tier, string> = { 0: '', 1: '3', 2: '4–5', 3: '6+' };

// ---- The calendar view's own looks, for the parts each prototype keeps.

const BAND: Record<DayKind, string> = {
  trip: 'trip-band',
  draft: 'bg-primary/15 dark:bg-primary/35',
  holiday: 'bg-destructive/10 dark:bg-destructive/20',
  weekend: 'bg-muted',
  plain: '',
};

function numberClass(c: DayCell): string {
  if (c.picked) return 'bg-foreground font-semibold text-background';
  switch (c.kind) {
    case 'trip':
      return c.end ? 'trip-solid font-semibold' : 'trip-ink font-semibold';
    case 'draft':
      return c.end ? 'bg-primary font-semibold text-primary-foreground' : 'font-semibold';
    case 'holiday':
      return 'font-semibold text-destructive';
    case 'weekend':
      return 'text-muted-foreground';
    default:
      return '';
  }
}

/** "9 days off for 3 days of leave, Wed 2 Dec – Fri 4 Dec". */
function gainText(c: DayCell): string {
  if (!c.best || heatLevel(c.value) === 0) return '';
  const { off, leave, from, to } = c.best;
  const y = yearOf(c.key);
  return `${off} days off for ${leave} ${leave === 1 ? 'day' : 'days'} of leave${leave > 1 ? `, ${fmt(from, y)} – ${fmt(to, y)}` : ''}`;
}

/** A working day in a break worth taking: the day to book. */
const bookable = (c: DayCell | null | undefined): boolean => !!c && c.kind === 'plain' && heatLevel(c.value) > 0;
/** Any day inside a break worth taking, free days included, that a trip or the draft does not claim. */
const inBreak = (c: DayCell | null | undefined): boolean => !!c && c.kind !== 'trip' && c.kind !== 'draft' && heatLevel(c.heat) > 0;
/** The calendar view's own bands: trips, weekends and holidays join their neighbours. */
const JOINS: Partial<Record<DayKind, true>> = { trip: true, weekend: true, holiday: true };

interface Props {
  style: HeatStyle;
  cell: DayCell;
  prev: DayCell | null | undefined;
  next: DayCell | null | undefined;
  /** Column in the week row, 0–6: bands never join across the row edge. */
  col: number;
  onTapDay: (key: string) => void;
}

export function VariantDay({ style, cell, prev, next, col, onTapDay }: Props) {
  const gain = cell.kind !== 'trip' ? gainText(cell) : '';
  const tip = cell.holiday || gain;
  const ownJoinL = !!JOINS[cell.kind] && cell.joinLeft;
  const ownJoinR = !!JOINS[cell.kind] && cell.joinRight;
  let button: React.ReactElement;

  if (style === 'dots') {
    const tier = cell.kind === 'plain' ? tierOf(cell.value) : 0;
    button = (
      <button
        type="button"
        data-day={cell.key}
        aria-label={gain ? `${cell.aria}, ${gain}` : cell.aria}
        onClick={() => onTapDay(cell.key)}
        style={cell.color ? ({ '--trip': cell.color } as CSSProperties) : undefined}
        className={cn('group relative grid h-8 min-w-0 place-items-center outline-none select-none', BAND[cell.kind], cell.kind !== 'plain' && 'rounded-full', ownJoinL && 'rounded-l-none', ownJoinR && 'rounded-r-none')}
      >
        <span className={cn('grid size-7 place-items-center rounded-full text-[13px] leading-none transition-shadow group-hover:ring-1 group-hover:ring-foreground/40 group-hover:ring-inset group-focus-visible:ring-3 group-focus-visible:ring-ring/50', numberClass(cell), tier > 0 && 'font-medium')}>
          {cell.n}
        </span>
        {tier > 0 && (
          <span aria-hidden="true" className="absolute bottom-[1px] left-1/2 flex -translate-x-1/2 gap-[3px]">
            {Array.from({ length: tier }, (_, i) => (
              <span key={i} className="size-1 rounded-full bg-heat-3" />
            ))}
          </span>
        )}
      </button>
    );
  } else if (style === 'bands') {
    const on = inBreak(cell);
    const book = bookable(cell);
    const bridge = book && cell.value >= 4;
    const joinL = on ? col > 0 && inBreak(prev) : ownJoinL;
    const joinR = on ? col < 6 && inBreak(next) : ownJoinR;
    button = (
      <button
        type="button"
        data-day={cell.key}
        aria-label={gain ? `${cell.aria}, ${gain}` : cell.aria}
        onClick={() => onTapDay(cell.key)}
        style={cell.color ? ({ '--trip': cell.color } as CSSProperties) : undefined}
        className={cn('group relative grid h-8 min-w-0 place-items-center outline-none select-none', on ? 'bg-heat-1' : BAND[cell.kind], (on || cell.kind !== 'plain') && 'rounded-full', joinL && 'rounded-l-none', joinR && 'rounded-r-none')}
      >
        <span
          className={cn(
            'grid size-7 place-items-center rounded-full text-[13px] leading-none transition-shadow group-hover:ring-1 group-hover:ring-foreground/40 group-hover:ring-inset group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
            book ? (bridge ? 'bg-heat-4 font-semibold text-heat-4-foreground' : 'bg-heat-3 font-semibold text-heat-3-foreground') : numberClass(cell),
          )}
        >
          {cell.n}
        </span>
      </button>
    );
  } else {
    // tiers
    const tier = cell.kind === 'plain' ? tierOf(cell.value) : 0;
    const hot = tier > 0;
    const joinL = hot ? col > 0 && bookable(prev) && !!prev && tierOf(prev.value) > 0 : ownJoinL;
    const joinR = hot ? col < 6 && bookable(next) && !!next && tierOf(next.value) > 0 : ownJoinR;
    const tile =
      cell.picked || (cell.kind === 'draft' && cell.end)
        ? 'bg-foreground font-semibold text-background'
        : cell.kind === 'trip'
          ? 'trip-solid font-semibold'
          : cell.kind === 'draft'
            ? 'inset-ring-2 inset-ring-foreground font-semibold bg-muted'
            : cell.kind === 'holiday'
              ? 'bg-destructive/10 font-semibold text-destructive dark:bg-destructive/20'
              : cell.kind === 'weekend'
                ? 'bg-muted text-muted-foreground'
                : TIER_CLASS[tier];
    button = (
      <button
        type="button"
        data-day={cell.key}
        aria-label={gain ? `${cell.aria}, ${gain}` : cell.aria}
        onClick={() => onTapDay(cell.key)}
        style={cell.color ? ({ '--trip': cell.color } as CSSProperties) : undefined}
        className={cn('group relative grid h-8 min-w-0 place-items-center outline-none select-none', joinL ? 'pl-0' : 'pl-0.5', joinR ? 'pr-0' : 'pr-0.5')}
      >
        <span className={cn('relative grid h-7 w-full place-items-center rounded-md text-[13px] leading-none transition-shadow group-hover:ring-1 group-hover:ring-foreground/40 group-hover:ring-inset group-focus-visible:ring-3 group-focus-visible:ring-ring/50', joinL && 'rounded-l-none', joinR && 'rounded-r-none', tile)}>
          {cell.n}
        </span>
      </button>
    );
  }

  if (!tip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

/** The legend of each prototype, for the header. */
export function VariantLegend({ style, className }: { style: HeatStyle; className?: string }) {
  if (style === 'dots') {
    return (
      <span className={cn('flex items-center gap-2', className)}>
        <span>Days off per day of leave</span>
        {([1, 2, 3] as Tier[]).map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span className="flex gap-[3px]">
              {Array.from({ length: t }, (_, i) => (
                <span key={i} className="size-1 rounded-full bg-heat-3" />
              ))}
            </span>
            <span className="tabular-nums">{TIER_LABEL[t]}</span>
          </span>
        ))}
      </span>
    );
  }
  if (style === 'bands') {
    return (
      <span className={cn('flex items-center gap-2.5', className)}>
        <span className="flex items-center gap-1">
          <span className="h-3.5 w-6 rounded-full bg-heat-1" />
          Time off
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3.5 rounded-full bg-heat-3" />
          Day to book
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3.5 rounded-full bg-heat-4" />
          Bridge day · 4+ off for 1
        </span>
      </span>
    );
  }
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <span>Days off per day of leave</span>
      <span className="flex gap-0.5">
        {([1, 2, 3] as Tier[]).map((t) => (
          <span key={t} className={cn('grid h-4 min-w-5 place-items-center rounded-[4px] px-1 text-[10px] leading-none tabular-nums', TIER_CLASS[t])}>
            {TIER_LABEL[t]}
          </span>
        ))}
      </span>
    </span>
  );
}
