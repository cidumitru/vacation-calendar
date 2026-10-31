import { CalendarCheckIcon, ChevronLeftIcon, ChevronRightIcon, FlameIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { HeatLegend } from '@/components/heat-scale';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Toggle } from '@/components/ui/toggle';
import type { CalendarView } from '@/lib/types';

interface Props {
  year: number;
  /** Away from today: another year, or on phones another month. */
  showToday: boolean;
  holidaysOn: boolean;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** Extra controls at the right end. */
  children?: ReactNode;
}

export function AppHeader(p: Props) {
  const heat = p.view === 'heatmap';
  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b px-3 sm:gap-2 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden data-vertical:h-4 data-vertical:self-auto sm:block" />
      <ButtonGroup aria-label="Change year">
        <Button variant="outline" size="icon-sm" aria-label="Previous year" onClick={p.onPrev}>
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next year" onClick={p.onNext}>
          <ChevronRightIcon />
        </Button>
      </ButtonGroup>
      <h1 className="px-1 text-lg font-semibold tabular-nums">{p.year}</h1>
      {p.showToday && (
        // Icon-only on phones, where the header has no room for the word.
        <Button variant="ghost" size="sm" onClick={p.onToday} className="px-2 sm:px-2.5">
          <CalendarCheckIcon className="sm:hidden" />
          <span className="sr-only sm:not-sr-only">Today</span>
        </Button>
      )}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="mr-2 hidden items-center gap-4 text-xs text-muted-foreground lg:flex" aria-hidden="true">
          {heat ? (
            <HeatLegend />
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-5 rounded-full bg-muted-foreground/20" />
                Weekend
              </span>
              {p.holidaysOn && (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-5 rounded-full bg-destructive/15" />
                  Holiday
                </span>
              )}
            </>
          )}
        </div>
        <Toggle variant="outline" pressed={heat} onPressedChange={(on) => p.onViewChange(on ? 'heatmap' : 'calendar')}>
          <FlameIcon />
          <span className="sr-only sm:not-sr-only">Heat map</span>
        </Toggle>
        {p.children}
      </div>
    </header>
  );
}
