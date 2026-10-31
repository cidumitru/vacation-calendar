// On phones a tap on a day shows the day in a sheet docked at the bottom: what it is (a working day, a weekend, a
// public holiday, part of a trip), what the heat map computed for it (the break a day or a few days of leave there
// would buy) and the buttons that start or end a trip on it, take that break whole, or remove the trip. The sheet is
// not modal: nothing dims, the calendar keeps working behind it and tapping another day updates it in place, as a
// place card does on a map. It closes by its button, a swipe down, Escape, or when the trip is done.

import { CalendarPlusIcon, FlagIcon, SparklesIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useRef } from 'react';
import { HEAT_CLASS, heatLevel } from '@/components/heat-scale';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDragDown } from '@/hooks/use-drag-down';
import type { Block, DayCell } from '@/lib/calendar';
import { fmt } from '@/lib/dates';
import type { Trip } from '@/lib/types';
import { cn, plural } from '@/lib/utils';

interface Props {
  /** The tapped day; null closes. */
  cell: DayCell | null;
  /** The trip the day belongs to, when it does. */
  trip: Trip | null;
  /** The first day of a pick in progress, or ''. */
  draftFrom: string;
  /** The year in view, so dates in it show without their year. */
  year: number;
  onClose: () => void;
  onStart: (key: string) => void;
  onEnd: (key: string) => void;
  onCancelPick: () => void;
  onTakeBreak: (block: Block) => void;
  onRemoveTrip: (id: string) => void;
}

/** "Working day", "Weekend", "Public holiday · Labour Day" or "Part of “Summer”". */
export function kindOf(c: DayCell, trip: Trip | null): string {
  if (trip) return `Part of “${trip.name}”`;
  if (c.holiday) return `Public holiday · ${c.holiday}`;
  if (c.kind === 'weekend') return 'Weekend';
  return 'Working day';
}

/** What the heat map computed for the day, as one sentence. */
export function insightOf(c: DayCell, year: number): string {
  const b = c.best;
  if (b && heatLevel(c.value) > 0) {
    const off = `${b.off} days off, ${fmt(b.start, year)} – ${fmt(b.end, year)}`;
    return b.leave === 1 ? `One day of leave here buys ${off}.` : `${plural(b.leave, 'day')} of leave, ${fmt(b.from, year)} – ${fmt(b.to, year)}, buy ${off}.`;
  }
  if (c.holiday || c.kind === 'weekend') return heatLevel(c.heat) > 0 ? 'Already off, and part of a break worth taking: the working days around it say how.' : 'Already off.';
  return 'A regular working day: no public holiday close enough to stretch it into a longer break.';
}

export function DaySheet(p: Props) {
  // The last day shown stays for the closing animation, after the cell has gone.
  const last = useRef<{ cell: DayCell; trip: Trip | null } | null>(null);
  if (p.cell) last.current = { cell: p.cell, trip: p.trip };
  const shown = p.cell ? { cell: p.cell, trip: p.trip } : last.current;
  const drag = useDragDown(p.onClose);
  if (!shown) return null;
  const { cell: c, trip } = shown;
  const level = c.best ? heatLevel(c.value) : 0;
  const picking = !!p.draftFrom;
  const first = picking && p.draftFrom === c.key;

  return (
    <Sheet open={!!p.cell} modal={false} onOpenChange={(o) => !o && p.onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        style={drag.style}
        {...drag.handlers}
        className={cn(
          'gap-0 rounded-t-2xl border-t p-0 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.14)] [touch-action:none] select-none',
          drag.dragging && 'transition-none',
        )}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{fmt(c.key, p.year)}</SheetTitle>
          <SheetDescription>{kindOf(c, trip)}</SheetDescription>
        </SheetHeader>
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-muted-foreground/30" aria-hidden="true" />
        <div className="flex flex-col gap-3 px-4 pt-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-base font-semibold">{fmt(c.key, p.year)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{kindOf(c, trip)}</p>
            </div>
            {c.best && level > 0 && (
              <span
                className={cn('grid h-6 min-w-9 shrink-0 place-items-center rounded-md px-1.5 text-xs font-semibold tabular-nums', HEAT_CLASS[level])}
                aria-label={`${c.value} days off per day of leave`}
              >
                {Number.isInteger(c.value) ? c.value : c.value.toFixed(1)}×
              </span>
            )}
            {trip && <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: trip.color }} aria-hidden="true" />}
            <Button type="button" variant="secondary" size="icon-sm" className="-mt-0.5 -mr-1 rounded-full" aria-label="Close" onClick={p.onClose}>
              <XIcon />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{insightOf(c, p.year)}</p>

          {first ? (
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm">First day of the trip. Now tap the last day.</p>
              <Button type="button" variant="outline" onClick={p.onCancelPick}>
                Cancel
              </Button>
            </div>
          ) : picking ? (
            <div className="flex flex-col gap-2">
              <Button type="button" size="lg" onClick={() => p.onEnd(c.key)}>
                <FlagIcon />
                End the trip here
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => p.onStart(c.key)}>
                Start over here
              </Button>
            </div>
          ) : trip ? (
            <div className="border-t pt-3">
              <Button type="button" variant="destructive" size="lg" className="w-full" onClick={() => p.onRemoveTrip(trip.id)}>
                <Trash2Icon />
                Remove “{trip.name}”
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button type="button" size="lg" onClick={() => p.onStart(c.key)}>
                <CalendarPlusIcon />
                Start a trip here
              </Button>
              {c.best && level > 0 && (
                <Button type="button" variant="secondary" size="lg" onClick={() => p.onTakeBreak(c.best!)}>
                  <SparklesIcon />
                  Take this break · {plural(c.best.leave, 'day')}
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
