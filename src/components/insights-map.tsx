// The insights panel's content: twelve month strips that show where the holidays, the breaks worth taking and the
// trips fall, a ledger of the year's figures, and the breaks in date order with every length on its own line.

import { CheckIcon, PlusIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { HEAT_CLASS, heatLevel } from '@/components/heat-scale';
import { ValueBadge, breakRange, fmtValue, leaveRange, plural, suggestionNote, type InsightsViewProps } from '@/components/insights-bits';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DayCell, YearModel } from '@/lib/calendar';
import { DAY_SHORT, MONTH_NAMES, MONTH_SHORT, fmt, yearOf } from '@/lib/dates';
import { clusterName, type Cluster, type FrontierPoint, type Suggestion } from '@/lib/insights';
import { PALETTE } from '@/lib/palette';
import type { WeekStart } from '@/lib/types';
import { cn } from '@/lib/utils';

export function InsightsMap(p: InsightsViewProps) {
  const i = p.insights;
  const year = i.year;
  const note = suggestionNote(p);
  const picked = new Set(i.plan.picks.map((s) => s.id));
  // Breaks by the month their leave starts in.
  const byMonth = new Map<number, Cluster[]>();
  for (const c of i.clusters) {
    const m = Number(c.best.from.slice(5, 7)) - 1;
    byMonth.set(m, [...(byMonth.get(m) ?? []), c]);
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-label={`Map of ${year}`} className="flex flex-col gap-2">
        <YearMap model={p.model} today={p.today} onJumpMonth={p.onJumpMonth} />
        <ul className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground" aria-label="Legend">
          <Swatch className="bg-destructive">Holiday</Swatch>
          <Swatch className="bg-foreground/15">Weekend</Swatch>
          <Swatch className={HEAT_CLASS[3]}>Leave worth taking</Swatch>
          <Swatch style={{ background: PALETTE[0] }}>Trip</Swatch>
          <Swatch className="ring-[1.5px] ring-foreground ring-inset">Today</Swatch>
        </ul>
      </section>

      <section aria-label={`${year} in figures`}>
        <dl className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 text-sm">
          <Row label="Days">{i.days}</Row>
          <Row label="Working days">{i.workingDays}</Row>
          <Row label="Weekend days">{i.weekendDays}</Row>
          <Row label="Public holidays">{p.holidaysOn ? i.holidays.length : '—'}</Row>
          {p.holidaysOn && (
            <>
              <Row label="on working days" sub>
                {i.onWeekdays.length}
              </Row>
              <Row label="on weekends" sub>
                {i.onWeekends.length}
              </Row>
              {i.onWeekends.length > 0 && (
                <dd className="col-span-2 flex flex-col gap-0.5 pb-1 pl-3 text-xs text-muted-foreground">
                  {i.onWeekends.map((h) => (
                    <span key={h.key} className="flex justify-between gap-2">
                      <span className="truncate">{h.name}</span>
                      <span className="shrink-0 tabular-nums">{fmt(h.key, year)}</span>
                    </span>
                  ))}
                </dd>
              )}
              <Row label="by weekday" sub>
                <WeekdayBars counts={i.byWeekday} weekStart={p.weekStart} />
              </Row>
              <Row label="Bridge days" hint="one day of leave, four or more days off">
                {i.bridgeDays}
              </Row>
            </>
          )}
          <dt className="col-span-2 mt-2 border-t pt-2 text-xs font-medium text-sidebar-foreground/70">Leave</dt>
          <Row label="Allowance">{p.allowance}</Row>
          <Row label="Planned" hint={i.planned.trips ? `${plural(i.planned.trips, 'trip')}, ${plural(i.planned.days, 'day')} away` : undefined}>
            {i.planned.leave}
          </Row>
          <Row label="Left">{i.left}</Row>
          {i.plan.off > 0 && (
            <Row label="Could buy" hint={`${plural(i.plan.leave, 'day')} of leave, ${plural(i.plan.picks.length, 'break')}`}>
              {i.plan.off} days off
            </Row>
          )}
          {i.plan.frontier.length > 1 && (
            <dd className="col-span-2 text-xs text-muted-foreground">
              <FrontierText points={i.plan.frontier} />
            </dd>
          )}
        </dl>
      </section>

      <section aria-label="Breaks by month" className="flex flex-col gap-3">
        <h3 className="text-xs font-medium text-sidebar-foreground/70">Breaks worth taking, in date order</h3>
        {note ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">{note}</p>
        ) : (
          [...byMonth.entries()].map(([m, clusters]) => (
            <div key={m} className="flex flex-col gap-2">
              <button
                type="button"
                className="w-fit text-xs font-semibold tracking-wide uppercase hover:underline"
                onClick={() => p.onJumpMonth(m)}
                aria-label={`Go to ${MONTH_NAMES[m]}`}
              >
                {MONTH_NAMES[m]}
              </button>
              {clusters.map((c) => (
                <article key={c.id} className="flex gap-2.5">
                  <span className="mt-1 flex w-1 shrink-0 flex-col items-center">
                    <span className="size-1.5 rounded-full bg-destructive" aria-hidden="true" />
                    <span className="w-px flex-1 bg-border" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
                    <div className="flex items-center gap-2">
                      <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium">{clusterName(c.holidays)}</p>
                      <ValueBadge value={c.best.value} className="h-5 min-w-8 text-[11px]" />
                    </div>
                    <ul className="flex flex-col">
                      {c.options.map((o) => (
                        <OptionLine key={o.id} s={o} year={year} best={o === c.best} starred={picked.has(o.id)} onAdd={p.onAdd} />
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Row({ label, hint, sub, children }: { label: string; hint?: string; sub?: boolean; children: React.ReactNode }) {
  return (
    <>
      <dt className={cn('text-muted-foreground', sub && 'pl-3 text-xs')}>
        {label}
        {hint && <span className="block text-[11px] text-muted-foreground/70">{hint}</span>}
      </dt>
      <dd className={cn('text-right font-medium tabular-nums', sub && 'text-xs')}>{children}</dd>
    </>
  );
}

function Swatch({ className, style, children }: { className?: string; style?: CSSProperties; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1">
      <span className={cn('size-2.5 rounded-[2px]', className)} style={style} aria-hidden="true" />
      {children}
    </li>
  );
}

/** Seven tiny bars, in the week's order. */
function WeekdayBars({ counts, weekStart }: { counts: number[]; weekStart: WeekStart }) {
  const order = weekStart === 'Sunday' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
  const max = Math.max(1, ...counts);
  return (
    <span className="inline-flex items-end gap-0.5" role="img" aria-label={order.map((d) => `${DAY_SHORT[d]} ${counts[d]}`).join(', ')}>
      {order.map((d) => (
        <Tooltip key={d}>
          <TooltipTrigger asChild>
            <span className="flex w-3 flex-col items-center gap-0.5">
              <span className="flex h-6 w-full items-end">
                <span
                  className={cn('w-full rounded-[2px]', counts[d] ? (d === 0 || d === 6 ? 'bg-foreground/30' : 'bg-destructive/80') : 'bg-foreground/10')}
                  style={{ height: `${counts[d] ? Math.max(15, (counts[d] / max) * 100) : 8}%` }}
                />
              </span>
              <span className="text-[9px] leading-none font-normal text-muted-foreground" aria-hidden="true">
                {DAY_SHORT[d][0]}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {plural(counts[d], 'holiday')} on a {DAY_SHORT[d]}
          </TooltipContent>
        </Tooltip>
      ))}
    </span>
  );
}

/** "1 → 7 · 2 → 12 · 3 → 17 … 8 → 34": what each number of days of leave could buy. */
function FrontierText({ points }: { points: FrontierPoint[] }) {
  const MAX = 6;
  let pts = points;
  let gap = false;
  if (pts.length > MAX) {
    pts = [...points.slice(0, MAX - 2), ...points.slice(-2)];
    gap = true;
  }
  return (
    <span>
      {pts.map((q, k) => (
        <span key={q.leave}>
          {k > 0 && (gap && k === pts.length - 2 ? ' … ' : ' · ')}
          <span className="whitespace-nowrap tabular-nums">
            {q.leave} → {q.off}
          </span>
        </span>
      ))}
      <span className="block text-muted-foreground/70">days of leave → days off</span>
    </span>
  );
}

interface LineProps {
  s: Suggestion;
  year: number;
  best: boolean;
  starred: boolean;
  onAdd: (picks: Suggestion[]) => void;
}

function OptionLine({ s, year, best, starred, onAdd }: LineProps) {
  const taken = !!s.trip;
  const line = (
    <li>
      <button
        type="button"
        disabled={taken}
        onClick={() => onAdd([s])}
        aria-label={taken ? `${breakRange(s, year)}, planned as ${s.trip!.name}` : `Add ${breakRange(s, year)}: ${plural(s.off, 'day')} off for ${plural(s.leave, 'day')} of leave`}
        className={cn(
          'grid w-full grid-cols-[2.25rem_1fr_auto_1.25rem] items-center gap-x-2 rounded-md py-1 pr-1 pl-1.5 text-left text-xs transition-colors outline-none',
          'hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60',
          best && 'font-medium',
          starred && !taken && 'text-primary',
        )}
      >
        <span className="tabular-nums">{s.leave}d</span>
        <span className="truncate text-muted-foreground">{breakRange(s, year)}</span>
        <span className="tabular-nums">{s.off} off</span>
        {taken ? <CheckIcon className="size-3.5" style={{ color: s.trip!.color }} /> : <PlusIcon className="size-3.5 opacity-60" />}
      </button>
    </li>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{line}</TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-0">
        <span>{taken ? `Planned as “${s.trip!.name}”` : `${fmtValue(s.value)} days off per day of leave${starred ? ' · in your best plan' : ''}`}</span>
        <span className="opacity-70">Leave {leaveRange(s, year)}</span>
      </TooltipContent>
    </Tooltip>
  );
}

// ---- The year map: a strip per month, a square per day.

interface MapProps {
  model: YearModel;
  today: string;
  onJumpMonth: (month: number) => void;
}

/** A day of the map, as the calendar's heat map colours it: trips, the draft, holidays and weekends in their own colours, a working day in its step. */
function mapCell(c: DayCell): { className: string; style?: CSSProperties } {
  if (c.kind === 'trip') return { className: '', style: { background: c.color ?? undefined } };
  if (c.kind === 'draft') return { className: 'bg-primary' };
  if (c.holiday) return { className: 'bg-destructive' };
  if (c.kind === 'weekend') return { className: 'bg-foreground/15' };
  const level = heatLevel(c.value);
  return { className: level ? HEAT_CLASS[level] : 'bg-foreground/[0.07]' };
}

function YearMap({ model, today, onJumpMonth }: MapProps) {
  return (
    <div className="flex flex-col gap-px" role="list">
      {model.months.map((m, ix) => {
        const days = m.cells.filter((c): c is DayCell => c !== null);
        const holidays = days.filter((c) => c.holiday).length;
        const hot = days.filter((c) => c.kind === 'plain' && heatLevel(c.value) > 0).length;
        const parts = [plural(holidays, 'holiday'), m.off ? `${plural(m.off, 'day')} off` : '', hot ? `${plural(hot, 'day')} of leave worth taking` : ''].filter(Boolean);
        return (
          <button
            key={m.name}
            type="button"
            role="listitem"
            onClick={() => onJumpMonth(ix)}
            aria-label={`${m.name}: ${parts.join(', ')}. Go to ${m.name}.`}
            className="grid grid-cols-[1.5rem_repeat(31,minmax(0,1fr))] items-center gap-px rounded-sm py-px outline-none hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="pr-1 text-left text-[10px] leading-none text-muted-foreground">{MONTH_SHORT[ix]}</span>
            {days.map((c) => {
              const { className, style } = mapCell(c);
              return <span key={c.key} className={cn('aspect-square rounded-[2px]', className, c.key === today && 'ring-[1.5px] ring-foreground ring-inset')} style={style} />;
            })}
          </button>
        );
      })}
      <span className="sr-only">Map of {yearOf(model.months[0].cells.find(Boolean)?.key ?? `${model.y}`)}</span>
    </div>
  );
}
