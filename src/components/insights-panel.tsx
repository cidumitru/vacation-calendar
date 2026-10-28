// The insights panel on the right: a column beside the calendar on wider screens, a sheet on phones. It holds the
// two prototypes of its content, switched from its header: "At a glance" (cards) and "Year map".

import { XIcon } from 'lucide-react';
import { InsightsCards } from '@/components/insights-cards';
import { InsightsMap } from '@/components/insights-map';
import type { InsightsViewProps } from '@/components/insights-bits';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type InsightsProto = 'cards' | 'map';

export const INSIGHTS_PROTO_KEY = 'vp-insights-proto';

export function loadProto(): InsightsProto {
  try {
    return localStorage.getItem(INSIGHTS_PROTO_KEY) === 'map' ? 'map' : 'cards';
  } catch {
    return 'cards';
  }
}

export function saveProto(p: InsightsProto): void {
  try {
    localStorage.setItem(INSIGHTS_PROTO_KEY, p);
  } catch {
    // Storage blocked: the choice lasts for the session.
  }
}

interface Props extends InsightsViewProps {
  isMobile: boolean;
  /** Open beside the calendar (wider screens). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open as a sheet (phones). */
  openMobile: boolean;
  onOpenMobileChange: (open: boolean) => void;
  proto: InsightsProto;
  onProtoChange: (p: InsightsProto) => void;
}

export const INSIGHTS_ID = 'insights-panel';

export function InsightsPanel({ isMobile, open, onOpenChange, openMobile, onOpenMobileChange, proto, onProtoChange, ...view }: Props) {
  const year = view.insights.year;
  const close = () => (isMobile ? onOpenMobileChange(false) : onOpenChange(false));
  const body = (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <div className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-sm font-semibold">{year} at a glance</span>
          <span className="truncate text-xs text-muted-foreground">{proto === 'cards' ? 'Prototype A · cards' : 'Prototype B · year map'}</span>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Prototype"
          value={proto}
          onValueChange={(v) => {
            if (v === 'cards' || v === 'map') onProtoChange(v);
          }}
        >
          <ToggleGroupItem value="cards" aria-label="Prototype A: cards" className="px-2.5 text-xs">
            A
          </ToggleGroupItem>
          <ToggleGroupItem value="map" aria-label="Prototype B: year map" className="px-2.5 text-xs">
            B
          </ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="icon-sm" aria-label="Close insights" onClick={close}>
          <XIcon />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
        {proto === 'cards' ? <InsightsCards {...view} /> : <InsightsMap {...view} />}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={onOpenMobileChange}>
        <SheetContent side="right" showCloseButton={false} className="w-[20rem] max-w-[88vw] gap-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="sr-only">
            <SheetTitle>Insights for {year}</SheetTitle>
            <SheetDescription>The year in numbers and the breaks worth taking.</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      id={INSIGHTS_ID}
      aria-label={`Insights for ${year}`}
      data-state={open ? 'open' : 'closed'}
      inert={!open}
      className={cn('hidden shrink-0 overflow-hidden transition-[width,margin] duration-200 ease-linear md:block', open ? 'mr-2 w-(--insights-width)' : 'mr-0 w-0')}
    >
      <div className="my-2 h-[calc(100svh-1rem)] w-(--insights-width)">{body}</div>
    </aside>
  );
}
