// The trip form, as a popover on the days picked in the calendar. After the first click it is a small note on that
// day asking for the last one and takes no focus, so the next click lands on a day; after the second it grows into
// the form: the dates (a date-range picker to adjust them), what they cost, a name, Add and Cancel. It follows its
// day as the calendar scrolls, hides while that day is scrolled out of view, stays open when something else is
// clicked (another day simply starts a new pick), and Escape cancels.

import { PlusIcon, XIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import type { Draft, WeekStart } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  draft: Draft;
  /** The day the popover sits on: the day clicked last, or the end of a range picked in the picker. '' hides it. */
  anchorKey: string;
  /** The calendar's scroller, where the day's cell is found by its data-day attribute. */
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** Changes whenever the set of mounted years changes, so a day that was not rendered yet is looked up again. */
  mountedYears: string;
  /** "Fri 6 Mar – Tue 10 Mar", or the first day alone while the last is still to be picked. */
  rangeText: string;
  /** "5 days · 3 off work · includes Labour Day". */
  summary: string;
  /** Why the trip cannot be added, or ''. */
  error: string;
  yearInView: number;
  minYear: number;
  maxYear: number;
  weekStart: WeekStart;
  isMobile: boolean;
  onNameChange: (name: string) => void;
  onRangeChange: (from: string, to: string) => void;
  onClear: () => void;
  onAdd: (e: FormEvent<HTMLFormElement>) => void;
}

/** What Radix measures to place the popover; the cell as contextElement lets the position follow the scroller. */
interface Anchor {
  getBoundingClientRect: () => DOMRect;
  contextElement?: Element;
}

export function TripPopover(p: Props) {
  const [cell, setCell] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setCell(p.anchorKey ? (p.scrollerRef.current?.querySelector<HTMLElement>(`[data-day="${p.anchorKey}"]`) ?? null) : null);
  }, [p.anchorKey, p.mountedYears, p.scrollerRef]);
  const anchor = useMemo<Anchor | null>(() => (cell ? { getBoundingClientRect: () => cell.getBoundingClientRect(), contextElement: cell } : null), [cell]);
  const anchorRef = useRef<Anchor | null>(null);
  anchorRef.current = anchor;

  const picking = !!p.draft.from && !p.draft.to;
  const complete = !!p.draft.from && !!p.draft.to;
  const open = !!p.draft.from && !!cell;

  // Once the range is complete the name field takes focus on desktop, so typing and Enter add the trip; on phones the
  // keyboard would cover the calendar, so the Add button is left one tap away instead.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (complete && !p.isMobile) inputRef.current?.focus({ preventScroll: true });
  }, [complete, p.isMobile]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (!o) p.onClear();
      }}
    >
      <PopoverAnchor virtualRef={anchorRef} />
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={6}
        collisionPadding={12}
        hideWhenDetached
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        aria-label={picking ? 'Picking a trip' : 'New trip'}
        className={cn('gap-3 p-3', picking ? 'w-auto' : 'w-80 max-w-[calc(100vw-1.5rem)]')}
      >
        {picking ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="grid leading-tight">
              <span className="font-medium">{p.rangeText}</span>
              <span className="text-xs text-muted-foreground">Now click the last day</span>
            </span>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Cancel" onClick={p.onClear}>
              <XIcon />
            </Button>
          </div>
        ) : (
          <form onSubmit={p.onAdd} className="flex flex-col gap-3">
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <DateRangePicker
                  id="trip-dates"
                  from={p.draft.from}
                  to={p.draft.to}
                  text={p.rangeText}
                  yearInView={p.yearInView}
                  minYear={p.minYear}
                  maxYear={p.maxYear}
                  weekStart={p.weekStart}
                  onChange={p.onRangeChange}
                />
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" onClick={p.onClear}>
                <XIcon />
              </Button>
            </div>
            <p className={cn('text-xs', p.error ? 'text-destructive' : 'text-muted-foreground')} aria-live="polite">
              {p.error || p.summary}
            </p>
            <Input
              ref={inputRef}
              id="trip-name"
              aria-label="Trip name"
              placeholder="Name, like Summer"
              autoComplete="off"
              value={p.draft.name}
              onChange={(e) => p.onNameChange(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" className="flex-1">
                <PlusIcon />
                Add trip
              </Button>
              <Button type="button" variant="ghost" onClick={p.onClear}>
                Cancel
              </Button>
            </div>
            {!p.isMobile && <p className="text-[11px] text-muted-foreground">Enter adds · Esc cancels</p>}
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
