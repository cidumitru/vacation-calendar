// The insights dialog: the year map, the year's figures and the breaks worth taking (see insights-map), opened from
// the bulb beside the year. App imports this file lazily, so the dialog, the map and the insights library load as
// their own chunk the first time the dialog opens.

import { useMemo } from 'react';
import { InsightsMap } from '@/components/insights-map';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BuildContext, YearModel } from '@/lib/calendar';
import type { LoadStatus } from '@/lib/holidayStore';
import { buildInsights, clusterName, type Suggestion } from '@/lib/insights';
import type { WeekStart } from '@/lib/types';

/** A break to add as a trip over its whole range, with the figures the toast names. */
export interface NewBreak {
  name: string;
  from: string;
  to: string;
  off: number;
  leave: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The year in view and the context it was built from. */
  model: YearModel;
  ctx: BuildContext;
  allowance: number;
  holidaysOn: boolean;
  status: LoadStatus;
  /** Today's 'YYYY-MM-DD', for the year map. */
  today: string;
  weekStart: WeekStart;
  onAdd: (breaks: NewBreak[]) => void;
  /** Scrolls the calendar to a month (0-based) of the year in view. */
  onJumpMonth: (month: number) => void;
}

const toBreak = (s: Suggestion): NewBreak => ({ name: clusterName(s.holidays), from: s.start, to: s.end, off: s.off, leave: s.leave });

export default function InsightsDialog(p: Props) {
  const insights = useMemo(() => buildInsights(p.model, p.ctx), [p.model, p.ctx]);
  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-5 pt-5 pr-14 pb-3">
          <DialogTitle>{insights.year} at a glance</DialogTitle>
          <DialogDescription>Holidays, your leave and the breaks worth taking.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <InsightsMap
            insights={insights}
            model={p.model}
            allowance={p.allowance}
            holidaysOn={p.holidaysOn}
            status={p.status}
            today={p.today}
            weekStart={p.weekStart}
            onAdd={(picks) => p.onAdd(picks.map(toBreak))}
            onJumpMonth={(m) => {
              p.onOpenChange(false);
              p.onJumpMonth(m);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
