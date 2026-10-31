// The trip form on the days picked in the calendar. On desktop it is a popover: after the first click a small note on
// that day asking for the last one, taking no focus so the next click lands on a day; after the second the form,
// anchored to the day clicked: the dates (a date-range picker to adjust them), what they cost, a name, Add and Cancel.
// It follows its day as the calendar scrolls, hides while that day is off screen, stays open when something else is
// clicked (another day simply starts a new pick), and Escape cancels. On phones the first day is picked from the
// day's own sheet, and the form opens as a sheet from the bottom once the last day is tapped.

import { PlusIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, type FormEvent, type RefObject } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDayAnchor } from '@/hooks/use-day-anchor';
import { useDragDown } from '@/hooks/use-drag-down';
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

export function TripPopover(p: Props) {
  const complete = !!p.draft.from && !!p.draft.to;
  const inputRef = useRef<HTMLInputElement>(null);
  if (p.isMobile) return <TripSheet {...p} open={complete} inputRef={inputRef} />;
  return <TripCard {...p} complete={complete} inputRef={inputRef} />;
}

type FormProps = Props & { inputRef: RefObject<HTMLInputElement | null> };

/** The form itself: the dates, what they cost, the name, Add and Cancel. */
function TripForm({ hint, ...p }: FormProps & { hint?: boolean }) {
  return (
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
        {hint && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" onClick={p.onClear}>
            <XIcon />
          </Button>
        )}
      </div>
      <p className={cn('text-xs', p.error ? 'text-destructive' : 'text-muted-foreground')} aria-live="polite">
        {p.error || p.summary}
      </p>
      <Input
        ref={p.inputRef}
        id="trip-name"
        aria-label="Trip name"
        placeholder="Name, like Summer"
        autoComplete="off"
        value={p.draft.name}
        onChange={(e) => p.onNameChange(e.target.value)}
      />
      <div className={cn('flex gap-2', hint ? 'items-center' : 'flex-col')}>
        <Button type="submit" size={hint ? 'default' : 'lg'} className="flex-1">
          <PlusIcon />
          Add trip
        </Button>
        <Button type="button" variant={hint ? 'ghost' : 'outline'} size={hint ? 'default' : 'lg'} onClick={p.onClear}>
          Cancel
        </Button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">Enter adds · Esc cancels</p>}
    </form>
  );
}

/** Desktop: the note after the first click, then the form, anchored to the day clicked last. */
function TripCard(p: FormProps & { complete: boolean }) {
  const { cellEl, anchorRef } = useDayAnchor(p.anchorKey, p.scrollerRef, p.mountedYears);
  const picking = !!p.draft.from && !p.draft.to;
  const open = !!p.draft.from && !!cellEl;

  // Once the range is complete the name field takes focus, so typing and Enter add the trip.
  useEffect(() => {
    if (p.complete) p.inputRef.current?.focus({ preventScroll: true });
  }, [p.complete, p.inputRef]);

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
          <TripForm {...p} hint />
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Phones: the form as a modal sheet from the bottom, with the name field focused once it is up. */
function TripSheet(p: FormProps & { open: boolean }) {
  const drag = useDragDown(p.onClear);
  return (
    <Sheet
      open={p.open}
      onOpenChange={(o) => {
        if (!o) p.onClear();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        style={drag.style}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          p.inputRef.current?.focus();
        }}
        className="gap-0 rounded-t-2xl border-t p-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="[touch-action:none] select-none" {...drag.handlers}>
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-muted-foreground/30" aria-hidden="true" />
          <SheetHeader className="px-4 pt-3 pb-1">
            <SheetTitle>New trip</SheetTitle>
            <SheetDescription>Adjust the dates, give it a name and add it.</SheetDescription>
          </SheetHeader>
        </div>
        <div className="px-4 pt-2">
          <TripForm {...p} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
