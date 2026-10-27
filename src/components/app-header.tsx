import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface Props {
  year: number;
  thisYear: number;
  holidaysOn: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** Extra controls at the right end, before the theme toggle. */
  children?: ReactNode;
}

export function AppHeader(p: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-auto" />
      <ButtonGroup aria-label="Change year">
        <Button variant="outline" size="icon-sm" aria-label="Previous year" onClick={p.onPrev}>
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next year" onClick={p.onNext}>
          <ChevronRightIcon />
        </Button>
      </ButtonGroup>
      <h1 className="px-1 text-lg font-semibold tabular-nums">{p.year}</h1>
      {p.year !== p.thisYear && (
        <Button variant="ghost" size="sm" onClick={p.onToday}>
          Today
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <div className="mr-2 hidden items-center gap-4 text-xs text-muted-foreground lg:flex" aria-hidden="true">
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
        </div>
        {p.children}
        <ThemeToggle />
      </div>
    </header>
  );
}
