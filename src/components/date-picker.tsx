import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fmt, iso } from '@/lib/dates';
import type { WeekStart } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  id?: string;
  /** What the field is, read out with its value: "Last day". */
  label: string;
  /** 'YYYY-MM-DD' or '' for nothing picked yet. */
  value: string;
  /** Shown while nothing is picked. */
  placeholder: string;
  /** Where the picker opens when nothing is picked: the month of this day, or January of the year in view. */
  near: string;
  yearInView: number;
  minYear: number;
  maxYear: number;
  weekStart: WeekStart;
  onChange: (key: string) => void;
}

// The app keeps dates as 'YYYY-MM-DD' keys; the picker works in local Date objects.
const toDate = (key: string): Date | undefined =>
  key ? new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) : undefined;
const toKey = (d: Date): string => iso(d.getFullYear(), d.getMonth(), d.getDate());

/** One day as a button that opens a month picker; picking a day closes it. */
export function DatePicker({ id, label, value, placeholder, near, yearInView, minYear, maxYear, weekStart, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const text = value ? fmt(value, yearInView) : placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" aria-label={`${label}: ${text}`} className={cn('w-full justify-start px-2.5 font-normal', !value && 'text-muted-foreground')}>
          <CalendarIcon className="text-muted-foreground" />
          <span className="truncate">{text}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={toDate(value)}
          defaultMonth={toDate(value) ?? toDate(near) ?? new Date(yearInView, 0, 1)}
          weekStartsOn={weekStart === 'Sunday' ? 0 : 1}
          captionLayout="dropdown"
          startMonth={new Date(minYear, 0)}
          endMonth={new Date(maxYear, 11)}
          onSelect={(d) => {
            if (!d) return;
            onChange(toKey(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
