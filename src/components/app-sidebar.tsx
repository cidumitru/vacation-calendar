import { CalendarDaysIcon, PalmtreeIcon, XIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
export interface TripRow {
  id: string;
  name: string;
  color: string;
  from: string;
  range: string;
  off: string;
}

export interface Segment {
  width: string;
  color: string;
}

interface Props {
  year: number;
  allowance: number;
  used: number;
  holidaysOn: boolean;
  segments: Segment[];
  trips: TripRow[];
  onRemove: (id: string) => void;
  onJump: (from: string) => void;
}

export function AppSidebar(p: Props) {
  const { setOpenMobile } = useSidebar();
  const left = Math.abs(p.allowance - p.used);

  return (
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <PalmtreeIcon className="size-4" />
          </div>
          <div className="grid leading-tight">
            <span className="text-sm font-semibold">Vacation Planner</span>
            <span className="text-xs text-muted-foreground">Plan your days off</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Summary</SidebarGroupLabel>
          <SidebarGroupContent>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Days left in {p.year}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {left}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    {p.used > p.allowance ? 'over' : 'of'} {p.allowance}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  {p.segments.map((s, i) => (
                    <span key={i} className="h-full" style={{ width: s.width, background: s.color }} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.used} of {p.allowance} days planned. {p.holidaysOn ? 'Weekends and public holidays are free.' : 'Weekends are free.'}
                </p>
              </CardContent>
            </Card>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Trips in {p.year}</SidebarGroupLabel>
          <SidebarGroupContent>
            {p.trips.length === 0 ? (
              <Empty className="px-2 py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDaysIcon />
                  </EmptyMedia>
                  <EmptyTitle>No trips in {p.year}</EmptyTitle>
                  <EmptyDescription>Click a first and a last day in the calendar to plan one.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <SidebarMenu>
                {p.trips.map((t) => (
                  <SidebarMenuItem key={t.id}>
                    <SidebarMenuButton
                      size="lg"
                      onClick={() => {
                        p.onJump(t.from);
                        setOpenMobile(false);
                      }}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden="true" />
                      <span className="grid min-w-0 flex-1 leading-tight">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{t.range}</span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{t.off}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction showOnHover aria-label={`Remove ${t.name}`} onClick={() => p.onRemove(t.id)}>
                      <XIcon />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-muted-foreground">Trips and settings stay in this browser. No account, no server.</p>
      </SidebarFooter>
    </Sidebar>
  );
}
