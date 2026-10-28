// Prototype A, "At a glance": four stat tiles, a leave card with the spend-to-get curve of the leave left, and the
// breaks ranked by value, one card per cluster with its other lengths as chips.

import { CheckIcon, PlusIcon, SparklesIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ValueBadge, breakRange, dayMonth, dealText, fmtValue, leaveRange, plural, suggestionNote, type InsightsViewProps } from '@/components/insights-bits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { byValue, clusterName, type FrontierPoint, type Suggestion } from '@/lib/insights';
import { cn } from '@/lib/utils';

const SHOW_FIRST = 6;

export function InsightsCards(p: InsightsViewProps) {
  const i = p.insights;
  const year = i.year;
  const note = suggestionNote(p);
  const clusters = [...i.clusters].sort((a, b) => byValue(a.best, b.best));
  const picked = new Set(i.plan.picks.map((s) => s.id));
  const [all, setAll] = useState(false);
  const shown = all ? clusters : clusters.slice(0, SHOW_FIRST);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={`${year} in numbers`} className="grid grid-cols-2 gap-2">
        <Stat n={i.workingDays} label="working days" hint={`of ${i.days}`} />
        <Stat n={i.weekendDays} label="weekend days" />
        <Stat n={i.onWeekdays.length} label="holidays off work" hint={p.holidaysOn ? 'on a weekday' : 'holidays are off'} />
        <Stat n={i.onWeekends.length} label="lost to weekends" hint={i.onWeekends.length ? i.onWeekends.map((h) => h.name.split(' · ')[0]).join(', ') : 'none this year'} />
      </section>

      <Card size="sm">
        <CardHeader>
          <CardDescription>Your leave in {year}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {i.left === 0 ? (
              <>
                0 <span className="text-sm font-normal text-muted-foreground">days left</span>
              </>
            ) : i.plan.off === 0 ? (
              <>
                {i.left} <span className="text-sm font-normal text-muted-foreground">{i.left === 1 ? 'day' : 'days'} left</span>
              </>
            ) : (
              <>
                {i.plan.off}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  days off for {i.plan.leave} of your {i.left} left
                </span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          {i.plan.frontier.length > 0 && <Frontier points={i.plan.frontier} />}
          <p className="text-xs text-muted-foreground">
            {i.planned.trips > 0
              ? `${plural(i.planned.trips, 'trip')} planned: ${plural(i.planned.leave, 'day')} of leave for ${plural(i.planned.days, 'day')} away. `
              : `Nothing planned yet; ${plural(p.allowance, 'day')} of leave to spend. `}
            {i.plan.picks.length > 0 && `The best ${plural(i.plan.picks.length, 'break')} for what is left are starred below.`}
            {i.left === 0 && i.planned.leave >= p.allowance && 'Every day of leave is planned.'}
          </p>
          {i.plan.picks.length > 0 && (
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => p.onAdd(i.plan.picks)}>
              <SparklesIcon />
              Add {i.plan.picks.length === 1 ? 'that break' : `these ${i.plan.picks.length} breaks`}
            </Button>
          )}
        </CardContent>
      </Card>

      <section aria-label="Best breaks" className="flex flex-col gap-2">
        <h3 className="px-1 text-xs font-medium text-sidebar-foreground/70">Best breaks, by days off per day of leave</h3>
        {note ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">{note}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((c) => {
              const others = c.options.filter((o) => o !== c.best);
              return (
                <li key={c.id} className="flex flex-col gap-2 rounded-xl bg-card p-3 text-card-foreground shadow-xs ring-1 ring-foreground/10">
                  <div className="flex items-start gap-2">
                    <ValueBadge value={c.best.value} className="mt-0.5" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="line-clamp-2 text-sm font-medium">{clusterName(c.holidays)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {breakRange(c.best, year)}
                        <br />
                        {dealText(c.best)} · {leaveRange(c.best, year)}
                      </p>
                    </div>
                    <AddButton s={c.best} year={year} starred={picked.has(c.best.id)} onAdd={p.onAdd} />
                  </div>
                  {others.length > 0 && (
                    <div className="flex flex-wrap gap-1" aria-label="Other lengths">
                      {others.map((o) => (
                        <Chip key={o.id} s={o} year={year} starred={picked.has(o.id)} onAdd={p.onAdd} />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {clusters.length > SHOW_FIRST && (
          <Button type="button" variant="ghost" size="sm" className="w-fit self-center" onClick={() => setAll((v) => !v)}>
            {all ? 'Show fewer' : `Show ${clusters.length - SHOW_FIRST} more`}
          </Button>
        )}
      </section>
    </div>
  );
}

function Stat({ n, label, hint }: { n: number; label: string; hint?: string }) {
  return (
    <div className="flex flex-col rounded-xl bg-card px-3 py-2.5 text-card-foreground shadow-xs ring-1 ring-foreground/10">
      <span className="text-2xl font-semibold tabular-nums">{n}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      {hint && <span className="mt-1 truncate text-[11px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}

const MAX_BARS = 12;

/** Spend-to-get: a bar per number of days of leave that buys more than the one before, the tallest being the plan. */
function Frontier({ points }: { points: FrontierPoint[] }) {
  // Keep the chart to MAX_BARS: the first points matter most, and the last is the plan.
  let pts = points;
  if (pts.length > MAX_BARS) {
    const step = (pts.length - 1) / (MAX_BARS - 1);
    pts = Array.from({ length: MAX_BARS }, (_, k) => points[Math.round(k * step)]);
  }
  const max = pts[pts.length - 1].off;
  return (
    <figure className="flex flex-col gap-1">
      <div className="flex h-14 items-end gap-1" role="img" aria-label={pts.map((q) => `${q.leave} for ${q.off}`).join(', ')}>
        {pts.map((q, k) => (
          <Tooltip key={q.leave}>
            <TooltipTrigger asChild>
              <span className="flex h-full min-w-0 flex-1 items-end">
                <span
                  className={cn('w-full rounded-sm', k === pts.length - 1 ? 'bg-primary' : 'bg-primary/40')}
                  style={{ height: `${Math.max(8, (q.off / max) * 100)}%` }}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {plural(q.leave, 'day')} of leave → {q.off} days off
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <figcaption className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{pts[0].leave} day → {pts[0].off} off</span>
        <span>
          {pts[pts.length - 1].leave} days → {pts[pts.length - 1].off} off
        </span>
      </figcaption>
    </figure>
  );
}

interface AddProps {
  s: Suggestion;
  year: number;
  /** Part of the best plan for the leave left. */
  starred: boolean;
  onAdd: (picks: Suggestion[]) => void;
}

function Tip({ s, year, starred, children }: AddProps & { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-0">
        <span>{s.trip ? `Planned as “${s.trip.name}”` : `${dealText(s)}${starred ? ' · in your best plan' : ''}`}</span>
        <span className="opacity-70">
          {breakRange(s, year)} · leave {leaveRange(s, year)}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function AddButton(a: AddProps) {
  const label = a.s.trip ? `Planned as ${a.s.trip.name}` : `Add ${breakRange(a.s, a.year)}: ${dealText(a.s)}`;
  return (
    <Tip {...a}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={cn('relative shrink-0', a.starred && !a.s.trip && 'border-primary text-primary')}
        aria-label={label}
        disabled={!!a.s.trip}
        onClick={() => a.onAdd([a.s])}
      >
        {a.s.trip ? <CheckIcon style={{ color: a.s.trip.color }} /> : <PlusIcon />}
        {a.starred && !a.s.trip && <SparklesIcon className="absolute -top-1.5 -right-1.5 size-3! rounded-full bg-sidebar text-primary" aria-hidden="true" />}
      </Button>
    </Tip>
  );
}

function Chip(a: AddProps) {
  const taken = !!a.s.trip;
  return (
    <Tip {...a}>
      <button
        type="button"
        disabled={taken}
        aria-label={taken ? `${plural(a.s.leave, 'day')} for ${a.s.off}, planned as ${a.s.trip!.name}` : `Add ${breakRange(a.s, a.year)}: ${dealText(a.s)}`}
        onClick={() => a.onAdd([a.s])}
        className={cn(
          'inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-xs tabular-nums transition-colors outline-none',
          'hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60',
          a.starred && !taken && 'border-primary text-primary',
        )}
      >
        {taken ? <CheckIcon className="size-3" style={{ color: a.s.trip!.color }} /> : <PlusIcon className="size-3 opacity-60" />}
        {a.s.leave}d → {a.s.off}
        <span className="sr-only"> days off, {fmtValue(a.s.value)} per day, from</span>
        <span className="text-muted-foreground">· {dayMonth(a.s.from)}</span>
      </button>
    </Tip>
  );
}
