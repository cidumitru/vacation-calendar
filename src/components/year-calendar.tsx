import { LightbulbIcon } from 'lucide-react';
import { memo, type CSSProperties, type RefObject, type UIEvent } from 'react';
import { HEAT_CLASS, HEAT_FREE_CLASS, heatLevel } from '@/components/heat-scale';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DayCell, DayKind, MonthModel, YearModel } from '@/lib/calendar';
import { fmt, yearOf } from '@/lib/dates';
import type { CalendarView } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  years: YearModel[];
  view: CalendarView;
  scrollerRef: RefObject<HTMLDivElement | null>;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onTapDay: (key: string) => void;
  /** Opens the insights dialog for a year, from the button in its heading. */
  onOpenInsights: (year: number) => void;
}

export function YearCalendar({ years, view, scrollerRef, onScroll, onTapDay, onOpenInsights }: Props) {
  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [overflow-anchor:none] sm:px-6"
    >
      {years.map((y) => (
        <YearSection key={y.y} model={y} view={view} onTapDay={onTapDay} onOpenInsights={onOpenInsights} />
      ))}
    </div>
  );
}

interface SectionProps {
  model: YearModel;
  view: CalendarView;
  onTapDay: (key: string) => void;
  onOpenInsights: (year: number) => void;
}

// Memoised on the cached year model: typing a trip name never re-renders a year.
const YearSection = memo(function YearSection({ model, view, onTapDay, onOpenInsights }: SectionProps) {
  return (
    <section data-year={model.y} aria-label={model.label} className="pt-5 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground tabular-nums">{model.y}</h2>
        <Separator className="flex-1" />
        <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => onOpenInsights(model.y)} aria-label={`Insights for ${model.y}`}>
          <LightbulbIcon />
          Insights
        </Button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] gap-x-8 gap-y-8">
        {model.months.map((m, i) => (
          <Month key={m.name} model={m} index={i} weekdays={model.weekdays} view={view} onTapDay={onTapDay} />
        ))}
      </div>
    </section>
  );
});

interface MonthProps {
  model: MonthModel;
  /** 0-based month, the target of a jump to a month. */
  index: number;
  weekdays: string[];
  view: CalendarView;
  onTapDay: (key: string) => void;
}

function Month({ model, index, weekdays, view, onTapDay }: MonthProps) {
  const heat = view === 'heatmap';
  return (
    <section data-month={index} aria-label={model.label} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-base font-semibold">{model.name}</h3>
        {model.off > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {model.off} {model.off === 1 ? 'day' : 'days'} off
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground" aria-hidden="true">
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {model.cells.map((c, i) => {
          if (!c) return <span key={`b${i}`} className="h-8" aria-hidden="true" />;
          if (!heat) return <Day key={c.key} cell={c} onTapDay={onTapDay} />;
          // Heat bands join across the row like the calendar bands; a day no heat reaches keeps its own band's joins.
          const col = i % 7;
          const band = heated(c);
          const joinLeft = band ? col > 0 && heated(model.cells[i - 1]) : !!JOINS[c.kind] && c.joinLeft;
          const joinRight = band ? col < 6 && heated(model.cells[i + 1]) : !!JOINS[c.kind] && c.joinRight;
          return <HeatDay key={c.key} cell={c} joinLeft={joinLeft} joinRight={joinRight} onTapDay={onTapDay} />;
        })}
      </div>
    </section>
  );
}

interface DayProps {
  cell: DayCell;
  onTapDay: (key: string) => void;
}

// ---- Calendar view: bands for trips, the draft, holidays and weekends.

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

/** A public holiday inside a trip or draft band keeps a small dot so it still reads as free. */
function dotClass(c: DayCell): string | null {
  if (!c.holiday || c.picked || (c.kind !== 'trip' && c.kind !== 'draft')) return null;
  if (c.end) return 'bg-white';
  return c.kind === 'trip' ? 'bg-(--trip)' : 'bg-destructive';
}

function Day({ cell, onTapDay }: DayProps) {
  const dot = dotClass(cell);
  const button = (
    <button
      type="button"
      data-day={cell.key}
      aria-label={cell.aria}
      onClick={() => onTapDay(cell.key)}
      style={cell.color ? ({ '--trip': cell.color } as CSSProperties) : undefined}
      className={cn(
        'group relative grid h-8 min-w-0 place-items-center outline-none select-none',
        BAND[cell.kind],
        cell.kind !== 'plain' && 'rounded-full',
        cell.joinLeft && 'rounded-l-none',
        cell.joinRight && 'rounded-r-none',
      )}
    >
      <span
        className={cn(
          'grid size-7 place-items-center rounded-full text-[13px] leading-none transition-shadow',
          'group-hover:ring-1 group-hover:ring-foreground/40 group-hover:ring-inset',
          'group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
          numberClass(cell),
        )}
      >
        {cell.n}
      </span>
      {dot && <span aria-hidden="true" className={cn('absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full', dot)} />}
    </button>
  );
  if (!cell.holiday) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{cell.holiday}</TooltipContent>
    </Tooltip>
  );
}

// ---- Heat map view: the calendar view's bands drawn as tiles. Every working day is shaded by its value (the
// days off per day of leave of its best block) and every free day by the strongest break that covers it, so a
// whole vacation reads as one band.

/** Bands of the calendar view that still join on their own where no heat reaches them. */
const JOINS: Partial<Record<DayKind, true>> = { trip: true, weekend: true, holiday: true };

const HOLIDAY_TILE = 'bg-destructive/10 text-destructive dark:bg-destructive/20';

/** Part of a heat band: a working or free day with heat, as opposed to a trip or the draft. */
function heated(c: DayCell | null | undefined): boolean {
  return !!c && c.kind !== 'trip' && c.kind !== 'draft' && heatLevel(c.heat) > 0;
}

/**
 * Working days wear their step; the weekends and holidays inside a break wear its darker shade, so a band shows which
 * days cost leave. Free days and trips keep their calendar colours where no heat reaches; the range being picked is
 * outlined over whatever it covers.
 */
function tileClass(c: DayCell): string {
  if (c.picked || (c.kind === 'draft' && c.end)) return 'bg-foreground font-semibold text-background';
  const level = heatLevel(c.heat);
  switch (c.kind) {
    case 'trip':
      return 'trip-solid font-semibold';
    case 'holiday':
      return cn(level ? HEAT_FREE_CLASS[level] : HOLIDAY_TILE, 'font-semibold');
    case 'weekend':
      return level ? HEAT_FREE_CLASS[level] : 'bg-muted text-muted-foreground';
    case 'draft':
      // value > 0 marks a working day; a free day under the draft keeps the darker shade.
      return cn('inset-ring-2 inset-ring-foreground font-semibold', level ? (c.value > 0 ? HEAT_CLASS[level] : HEAT_FREE_CLASS[level]) : c.holiday ? HOLIDAY_TILE : 'bg-muted');
    default:
      return HEAT_CLASS[level];
  }
}

/** A public holiday under a solid or heated tile keeps a dot; elsewhere its red number already says so. */
function tileDotClass(c: DayCell): string | null {
  if (!c.holiday) return null;
  if (c.picked || (c.kind === 'draft' && c.end)) return 'bg-destructive';
  if (c.kind === 'trip') return 'bg-white';
  if (heatLevel(c.heat) > 0) return 'bg-current';
  return null;
}

/** "9 days off for 3 days of leave, Wed 2 Dec – Fri 4 Dec": the best block through a shaded working day. */
function gainText(c: DayCell): string {
  if (!c.best || heatLevel(c.value) === 0) return '';
  const { off, leave, from, to } = c.best;
  const y = yearOf(c.key);
  return `${off} days off for ${leave} ${leave === 1 ? 'day' : 'days'} of leave${leave > 1 ? `, ${fmt(from, y)} – ${fmt(to, y)}` : ''}`;
}

interface HeatDayProps extends DayProps {
  joinLeft: boolean;
  joinRight: boolean;
}

function HeatDay({ cell, joinLeft, joinRight, onTapDay }: HeatDayProps) {
  const gain = cell.kind !== 'trip' ? gainText(cell) : '';
  const tip = cell.holiday || gain;
  const dot = tileDotClass(cell);
  const button = (
    <button
      type="button"
      data-day={cell.key}
      aria-label={gain ? `${cell.aria}, ${gain}` : cell.aria}
      onClick={() => onTapDay(cell.key)}
      style={cell.color ? ({ '--trip': cell.color } as CSSProperties) : undefined}
      className={cn(
        'group relative grid h-8 min-w-0 place-items-center outline-none select-none',
        joinLeft ? 'pl-0' : 'pl-0.5',
        joinRight ? 'pr-0' : 'pr-0.5',
      )}
    >
      <span
        className={cn(
          'relative grid h-7 w-full place-items-center rounded-md text-[13px] leading-none transition-shadow',
          'group-hover:ring-1 group-hover:ring-foreground/40 group-hover:ring-inset',
          'group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
          joinLeft && 'rounded-l-none',
          joinRight && 'rounded-r-none',
          tileClass(cell),
        )}
      >
        {cell.n}
        {dot && <span aria-hidden="true" className={cn('absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full', dot)} />}
      </span>
    </button>
  );
  if (!tip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
