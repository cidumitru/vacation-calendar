// The trip form on the days picked in the calendar. On desktop it is a popover: after the first click a small note on
// that day asking for the last one, taking no focus so the next click lands on a day; after the second the form,
// anchored to the day clicked: the first and last day, each a picker, what they cost, a name, Add and Cancel. It
// follows its day as the calendar scrolls, hides while that day is off screen, stays open when something else is
// clicked (another day simply starts a new pick), and Escape cancels. On phones there is no second click: a tap
// opens a small sheet from the bottom with the day and one button, Start a break here, and that button grows the
// sheet into the form with the day as the first day; the last day is picked there, and when the day sits in a break
// worth taking one tap sets both to that break.
import { CalendarPlusIcon, PlusIcon, SparklesIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { DatePicker } from '@/components/date-picker';
import { heatLevel } from '@/components/heat-scale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDayAnchor } from '@/hooks/use-day-anchor';
import { useDragDown } from '@/hooks/use-drag-down';
import type { DayCell } from '@/lib/calendar';
import { fmt } from '@/lib/dates';
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
  /** The day the form sits on, for the line on phones that says what a day of leave there is worth. */
  tapped: DayCell | null;
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
  // On phones the sheet opens on the first day alone; the last day is picked in it.
  if (p.isMobile) return <TripSheet {...p} open={!!p.draft.from} inputRef={inputRef} />;
  return <TripCard {...p} complete={complete} inputRef={inputRef} />;
}

type FormProps = Props & { inputRef: RefObject<HTMLInputElement | null> };

/** The form itself: the first and last day, what they cost, the name, Add and Cancel. */
function TripForm({ hint, ...p }: FormProps & { hint?: boolean }) {
  const pick = (from: string, to: string) => (to && to < from ? p.onRangeChange(to, from) : p.onRangeChange(from, to));
  const shared = { yearInView: p.yearInView, minYear: p.minYear, maxYear: p.maxYear, weekStart: p.weekStart };
  return (
    <form onSubmit={p.onAdd} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">First day</span>
          <DatePicker id="trip-from" label="First day" placeholder="Pick a day" value={p.draft.from} near={p.draft.to} onChange={(k) => pick(k, p.draft.to)} {...shared} />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Last day</span>
          <DatePicker id="trip-to" label="Last day" placeholder="Pick the last day" value={p.draft.to} near={p.draft.from} onChange={(k) => pick(p.draft.from, k)} {...shared} />
        </div>
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
      {hint ? (
        <>
          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1">
              <PlusIcon />
              Add trip
            </Button>
            <Button type="button" variant="ghost" onClick={p.onClear}>
              Cancel
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Enter adds · Esc cancels</p>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" className="w-full">
            <PlusIcon />
            Add trip
          </Button>
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={p.onClear}>
            Cancel
          </Button>
        </div>
      )}
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

/** "One day of leave here buys 5 days off, Sat 28 Nov – Wed 2 Dec.", for a day in a break worth taking; '' otherwise. */
function worthOf(c: DayCell | null, year: number): string {
  const b = c?.best;
  if (!c || !b || heatLevel(c.value) === 0) return '';
  const off = `${b.off} days off, ${fmt(b.start, year)} – ${fmt(b.end, year)}`;
  return b.leave === 1 ? `One day of leave here buys ${off}.` : `${b.leave} days of leave, ${fmt(b.from, year)} – ${fmt(b.to, year)}, buy ${off}.`;
}

/** "Working day", "Weekend" or "Public holiday · Labour Day". */
function kindOf(c: DayCell | null): string {
  if (!c) return '';
  if (c.holiday) return `Public holiday · ${c.holiday}`;
  return c.kind === 'weekend' ? 'Weekend' : 'Working day';
}

/**
 * Phones: a sheet from the bottom that starts small, the day and one button, and grows into the form when the button
 * is tapped. It is not modal, so another day tapped behind it simply moves it to that day; once the form is up a dim
 * layer covers the calendar and a tap on it cancels, as a modal sheet would.
 */
function TripSheet(p: FormProps & { open: boolean }) {
  const [expanded, setExpanded] = useState(false);
  // Another day tapped folds the sheet back to its small step; dates changed from inside the form do not.
  useEffect(() => {
    setExpanded(false);
  }, [p.anchorKey]);
  const drag = useDragDown(p.onClear);
  const worth = worthOf(p.tapped, p.yearInView);
  const block = p.tapped?.best;
  const onBlock = !!block && p.draft.from === block.start && p.draft.to === block.end;
  // The focus call must follow the tap at once for the phone's keyboard to come up, hence flushSync.
  const expand = () => {
    flushSync(() => setExpanded(true));
    p.inputRef.current?.focus();
  };
  const dim = p.open && expanded;
  return (
    <>
      {dim &&
        createPortal(
          <div
            className="fixed inset-0 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs animate-in fade-in-0 duration-100"
            aria-hidden="true"
            onClick={p.onClear}
          />,
          document.body,
        )}
      <Sheet
        open={p.open}
        modal={false}
        onOpenChange={(o) => {
          if (!o) p.onClear();
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          style={drag.style}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="gap-0 rounded-t-2xl border-t p-0 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.14)]"
        >
          <div className="[touch-action:none] select-none" {...drag.handlers}>
            <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-muted-foreground/30" aria-hidden="true" />
            <SheetHeader className="flex-row items-start gap-3 px-4 pt-3 pb-1">
              <div className="min-w-0 flex-1 leading-tight">
                <SheetTitle className="text-base">{expanded ? 'New trip' : p.rangeText}</SheetTitle>
                <SheetDescription className="mt-0.5 text-xs">{expanded ? worth || 'Pick the last day, give it a name and add it.' : kindOf(p.tapped)}</SheetDescription>
              </div>
              <Button type="button" variant="secondary" size="icon-sm" className="-mt-0.5 -mr-1 rounded-full" aria-label="Close" onClick={p.onClear}>
                <XIcon />
              </Button>
            </SheetHeader>
          </div>
          <div className="flex flex-col gap-3 px-4 pt-2">
            {!expanded ? (
              <>
                {worth && <p className="text-sm text-muted-foreground">{worth}</p>}
                <Button type="button" size="lg" onClick={expand}>
                  <CalendarPlusIcon />
                  Start a break here
                </Button>
              </>
            ) : (
              <>
                {worth && block && !onBlock && (
                  <Button type="button" variant="secondary" size="lg" onClick={() => p.onRangeChange(block.start, block.end)}>
                    <SparklesIcon />
                    Use this break · {block.off} days off for {block.leave === 1 ? '1 day' : `${block.leave} days`}
                  </Button>
                )}
                <TripForm {...p} />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
