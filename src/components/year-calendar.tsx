import { memo, type CSSProperties, type RefObject, type UIEvent } from 'react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DayCell, DayKind, MonthModel, YearModel } from '@/lib/calendar';
import { cn } from '@/lib/utils';

interface Props {
  years: YearModel[];
  scrollerRef: RefObject<HTMLDivElement | null>;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onTapDay: (key: string) => void;
}

export function YearCalendar({ years, scrollerRef, onScroll, onTapDay }: Props) {
  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [overflow-anchor:none] sm:px-6"
    >
      {years.map((y) => (
        <YearSection key={y.y} model={y} onTapDay={onTapDay} />
      ))}
    </div>
  );
}

// Memoised on the cached year model: typing a trip name never re-renders a year.
const YearSection = memo(function YearSection({ model, onTapDay }: { model: YearModel; onTapDay: (key: string) => void }) {
  return (
    <section data-year={model.y} aria-label={model.label} className="pt-5 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground tabular-nums">{model.y}</h2>
        <Separator className="flex-1" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] gap-x-8 gap-y-8">
        {model.months.map((m) => (
          <Month key={m.name} model={m} weekdays={model.weekdays} onTapDay={onTapDay} />
        ))}
      </div>
    </section>
  );
});

function Month({ model, weekdays, onTapDay }: { model: MonthModel; weekdays: string[]; onTapDay: (key: string) => void }) {
  return (
    <section aria-label={model.label} className="flex flex-col gap-2">
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
        {model.cells.map((c, i) => (c ? <Day key={c.key} cell={c} onTapDay={onTapDay} /> : <span key={`b${i}`} className="h-8" aria-hidden="true" />))}
      </div>
    </section>
  );
}

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

function Day({ cell, onTapDay }: { cell: DayCell; onTapDay: (key: string) => void }) {
  const dot = dotClass(cell);
  const button = (
    <button
      type="button"
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
