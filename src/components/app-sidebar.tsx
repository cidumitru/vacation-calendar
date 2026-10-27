import { CalendarDaysIcon, PalmtreeIcon, PlusIcon, XIcon } from 'lucide-react';
import type { FormEvent } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import type { Draft, WeekStart } from '@/lib/types';

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

export type HintKind = 'default' | 'draft' | 'error';

interface Props {
  year: number;
  minYear: number;
  maxYear: number;
  allowance: number;
  used: number;
  holidaysOn: boolean;
  weekStart: WeekStart;
  segments: Segment[];
  draft: Draft;
  dateText: string;
  onNameChange: (name: string) => void;
  onRangeChange: (from: string, to: string) => void;
  onClear: () => void;
  onAdd: (e: FormEvent<HTMLFormElement>) => void;
  hint: string;
  hintKind: HintKind;
  trips: TripRow[];
  onRemove: (id: string) => void;
  onJump: (from: string) => void;
}

export function AppSidebar(p: Props) {
  const { setOpenMobile } = useSidebar();
  const left = Math.abs(p.allowance - p.used);
  const hasDraft = !!(p.draft.name || p.draft.from || p.draft.to);

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
          <SidebarGroupLabel>New trip</SidebarGroupLabel>
          <SidebarGroupContent>
            <form onSubmit={p.onAdd}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="trip-name">Name</FieldLabel>
                  <Input
                    id="trip-name"
                    placeholder="Summer"
                    autoComplete="off"
                    value={p.draft.name}
                    onChange={(e) => p.onNameChange(e.target.value)}
                  />
                </Field>
                <Field data-invalid={p.hintKind === 'error' || undefined}>
                  <FieldLabel htmlFor="trip-dates">Dates</FieldLabel>
                  <DateRangePicker
                    id="trip-dates"
                    from={p.draft.from}
                    to={p.draft.to}
                    text={p.dateText}
                    yearInView={p.year}
                    minYear={p.minYear}
                    maxYear={p.maxYear}
                    weekStart={p.weekStart}
                    onChange={p.onRangeChange}
                  />
                  {p.hintKind === 'error' ? (
                    <FieldError aria-live="polite">{p.hint}</FieldError>
                  ) : (
                    <FieldDescription aria-live="polite" className={p.hintKind === 'draft' ? 'text-foreground' : undefined}>
                      {p.hint}
                    </FieldDescription>
                  )}
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={!p.draft.from}>
                    <PlusIcon />
                    Add trip
                  </Button>
                  {hasDraft && (
                    <Button type="button" variant="ghost" onClick={p.onClear}>
                      Clear
                    </Button>
                  )}
                </div>
              </FieldGroup>
            </form>
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
                  <EmptyDescription>Click a first and a last day in the calendar, or pick dates above.</EmptyDescription>
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
