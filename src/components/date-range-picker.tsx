import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { iso } from '@/lib/dates';
import type { WeekStart } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  id?: string;
  from: string; // 'YYYY-MM-DD' or ''
  to: string;
  /** What the trigger shows: the picked dates, or a prompt when nothing is picked. */
  text: string;
  /** The month the picker opens on when nothing is picked: January of the year in view. */
  yearInView: number;
  minYear: number;
  maxYear: number;
  weekStart: WeekStart;
  onChange: (from: string, to: string) => void;
}

// The app keeps dates as 'YYYY-MM-DD' keys; the picker works in local Date objects.
const toDate = (key: string): Date | undefined =>
  key ? new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) : undefined;
const toKey = (d: Date): string => iso(d.getFullYear(), d.getMonth(), d.getDate());

export function DateRangePicker({ id, from, to, text, yearInView, minYear, maxYear, weekStart, onChange }: Props) {
  const isMobile = useIsMobile();
  const selected: DateRange | undefined = from ? { from: toDate(from), to: toDate(to || from) } : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className={cn('w-full justify-start font-normal', !from && 'text-muted-foreground')}>
          <CalendarIcon className="text-muted-foreground" />
          <span className="truncate">{text}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          defaultMonth={selected?.from ?? new Date(yearInView, 0, 1)}
          numberOfMonths={isMobile ? 1 : 2}
          weekStartsOn={weekStart === 'Sunday' ? 0 : 1}
          captionLayout="dropdown"
          startMonth={new Date(minYear, 0)}
          endMonth={new Date(maxYear, 11)}
          onSelect={(range) => onChange(range?.from ? toKey(range.from) : '', range?.to ? toKey(range.to) : '')}
        />
      </PopoverContent>
    </Popover>
  );
}
