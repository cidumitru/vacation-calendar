// On phones a tap on a day shows the day first: what it is (a working day, a weekend, a public holiday, part of a
// trip), what the heat map computed for it (the break a day or a few days of leave there would buy) and the buttons
// that start or end a trip on it, take that break, or remove the trip. Three prototypes of the look share one body
// and are switched from a row at their foot: a sheet from the bottom, a card anchored to the day, and a bar docked at
// the bottom that stays while other days are tapped.

import { CalendarPlusIcon, FlagIcon, SparklesIcon, Trash2Icon, XIcon } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { HEAT_CLASS, heatLevel } from '@/components/heat-scale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDayAnchor } from '@/hooks/use-day-anchor';
import type { Block, DayCell } from '@/lib/calendar';
import { fmt } from '@/lib/dates';
import type { Trip } from '@/lib/types';
import { cn, plural } from '@/lib/utils';

export type DayInfoStyle = 'sheet' | 'card' | 'bar';

export const DAY_INFO_STYLE_KEY = 'vp-dayinfo-proto';

export function loadDayInfoStyle(): DayInfoStyle {
  try {
    const v = localStorage.getItem(DAY_INFO_STYLE_KEY);
    return v === 'card' || v === 'bar' ? v : 'sheet';
  } catch {
    return 'sheet';
  }
}

export function saveDayInfoStyle(s: DayInfoStyle): void {
  try {
    localStorage.setItem(DAY_INFO_STYLE_KEY, s);
  } catch {
    // Storage blocked: the choice lasts for the session.
  }
}

interface Props {
  /** The tapped day; null closes. */
  cell: DayCell | null;
  /** The trip the day belongs to, when it does. */
  trip: Trip | null;
  /** The first day of a pick in progress, or ''. */
  draftFrom: string;
  /** The year in view, so dates in it show without their year. */
  year: number;
  style: DayInfoStyle;
  onStyleChange: (s: DayInfoStyle) => void;
  scrollerRef: RefObject<HTMLDivElement | null>;
  mountedYears: string;
  onClose: () => void;
  onStart: (key: string) => void;
  onEnd: (key: string) => void;
  onCancelPick: () => void;
  onTakeBreak: (block: Block) => void;
  onRemoveTrip: (id: string) => void;
}

export function DayInfo(p: Props) {
  const { cellEl, anchorRef } = useDayAnchor(p.style === 'card' && p.cell ? p.cell.key : '', p.scrollerRef, p.mountedYears);
  if (!p.cell) return null;
  const c = p.cell;
  const title = `${fmt(c.key, p.year)}${c.key.slice(0, 4) === String(p.year) ? ` ${p.year}` : ''}`;
  const body = <Body {...p} cell={c} />;

  if (p.style === 'sheet') {
    return (
      <Sheet open onOpenChange={(o) => !o && p.onClose()}>
        <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-2xl p-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{kindOf(c, p.trip)}</SheetDescription>
          </SheetHeader>
          <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
          <div className="px-4 pt-2">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  if (p.style === 'card') {
    return (
      <Popover open={!!cellEl} onOpenChange={(o) => !o && p.onClose()}>
        <PopoverAnchor virtualRef={anchorRef} />
        <PopoverContent
          side="bottom"
          align="center"
          sideOffset={6}
          collisionPadding={12}
          hideWhenDetached
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-label={title}
          className="w-[calc(100vw-1.5rem)] max-w-80 gap-0 p-3"
        >
          {body}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={title}
      className="fixed inset-x-2 bottom-2 z-40 rounded-xl bg-popover p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-popover-foreground shadow-lg ring-1 ring-foreground/10"
    >
      {body}
    </div>
  );
}

/** "Working day", "Weekend", "Public holiday · Labour Day" or "Part of “Summer”". */
function kindOf(c: DayCell, trip: Trip | null): string {
  if (trip) return `Part of “${trip.name}”`;
  if (c.holiday) return `Public holiday · ${c.holiday}`;
  if (c.kind === 'weekend') return 'Weekend';
  return 'Working day';
}

/** What the heat map computed for the day, as one sentence. */
function insightOf(c: DayCell, year: number): string {
  const b = c.best;
  if (b && heatLevel(c.value) > 0) {
    const off = `${b.off} days off, ${fmt(b.start, year)} – ${fmt(b.end, year)}`;
    return b.leave === 1 ? `One day of leave here buys ${off}.` : `${plural(b.leave, 'day')} of leave, ${fmt(b.from, year)} – ${fmt(b.to, year)}, buy ${off}.`;
  }
  if (c.holiday || c.kind === 'weekend') return heatLevel(c.heat) > 0 ? 'Already off, and inside a break worth taking: the days around it tell how.' : 'Already off.';
  return 'A regular working day: no public holiday close enough to stretch it into a longer break.';
}

function Body(p: Props & { cell: DayCell }) {
  const c = p.cell;
  const level = c.best ? heatLevel(c.value) : 0;
  const picking = !!p.draftFrom;
  const first = picking && p.draftFrom === c.key;
  const bar = p.style === 'bar';
  const stack = p.style === 'sheet';

  let actions: ReactNode;
  if (first) {
    actions = (
      <>
        <p className="flex-1 text-sm text-muted-foreground">First day of the trip. Now tap the last day.</p>
        <Button type="button" variant="outline" size={bar ? 'sm' : 'default'} onClick={p.onCancelPick}>
          Cancel
        </Button>
      </>
    );
  } else if (picking) {
    actions = (
      <>
        <Button type="button" size={bar ? 'sm' : 'default'} className={cn(stack && 'flex-1')} onClick={() => p.onEnd(c.key)}>
          <FlagIcon />
          End the trip here
        </Button>
        <Button type="button" variant="outline" size={bar ? 'sm' : 'default'} onClick={() => p.onStart(c.key)}>
          Start over here
        </Button>
      </>
    );
  } else if (p.trip) {
    actions = (
      <Button type="button" variant="destructive" size={bar ? 'sm' : 'default'} className={cn(stack && 'flex-1')} onClick={() => p.onRemoveTrip(p.trip!.id)}>
        <Trash2Icon />
        Remove “{p.trip.name}”
      </Button>
    );
  } else {
    actions = (
      <>
        <Button type="button" size={bar ? 'sm' : 'default'} className={cn(stack && 'flex-1')} onClick={() => p.onStart(c.key)}>
          <CalendarPlusIcon />
          Start a trip here
        </Button>
        {c.best && level > 0 && (
          <Button type="button" variant="secondary" size={bar ? 'sm' : 'default'} className={cn(stack && 'flex-1')} onClick={() => p.onTakeBreak(c.best!)}>
            <SparklesIcon />
            Take this break · {plural(c.best.leave, 'day')}
          </Button>
        )}
      </>
    );
  }

  return (
    <div className={cn('flex flex-col', bar ? 'gap-2' : 'gap-3')}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 leading-tight">
          <p className={cn('font-semibold', bar ? 'text-sm' : 'text-base')}>{fmt(c.key, p.year)}</p>
          <p className="text-xs text-muted-foreground">{kindOf(c, p.trip)}</p>
        </div>
        {c.best && level > 0 && (
          <span className={cn('grid h-6 min-w-9 shrink-0 place-items-center rounded-md px-1.5 text-xs font-semibold tabular-nums', HEAT_CLASS[level])} aria-label={`${c.value} days off per day of leave`}>
            {Number.isInteger(c.value) ? c.value : c.value.toFixed(1)}×
          </span>
        )}
        {p.trip && <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: p.trip.color }} aria-hidden="true" />}
        {bar && (
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Close" onClick={p.onClose}>
            <XIcon />
          </Button>
        )}
      </div>
      <p className={cn('text-muted-foreground', bar ? 'text-xs' : 'text-sm')}>{insightOf(c, p.year)}</p>
      <div className={cn('flex gap-2', stack ? 'flex-col' : 'flex-wrap items-center')}>{actions}</div>
      <div className="flex items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground">
        <span>Prototype</span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Prototype"
          value={p.style}
          onValueChange={(v) => {
            if (v === 'sheet' || v === 'card' || v === 'bar') p.onStyleChange(v);
          }}
        >
          <ToggleGroupItem value="sheet" className="h-7 px-2 text-xs">
            1 Sheet
          </ToggleGroupItem>
          <ToggleGroupItem value="card" className="h-7 px-2 text-xs">
            2 Card
          </ToggleGroupItem>
          <ToggleGroupItem value="bar" className="h-7 px-2 text-xs">
            3 Bar
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
