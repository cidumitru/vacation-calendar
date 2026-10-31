// PROTOTYPE: comparing public holidays with another country, to find the days off you share with someone abroad.
// Two drawings and two ways of adding the country, picked with ?compare= in the URL; without the parameter the app
// is as before. Your own country (Settings.country) stays the one that counts for leave; the other (Settings.others)
// is only drawn.
//
//   ?compare=layers  Settings: a "Compare with" row under the country, with its own region, an X to remove it and
//                    an "Add a country" button. Calendar: holidays are tinted by country, red for yours and teal for
//                    theirs, and a day both are off is striped in the two tints.
//   ?compare=lanes   Settings: the other country as a chip with an X, and a round + chip that opens the search.
//                    Calendar: two thin lanes under the number, yours red and theirs teal, lit when that country is
//                    off; only a day both are off keeps the full holiday band, so the bands are the overlap.

import { CheckIcon, PlusIcon, XIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Combobox } from '@/components/combobox';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DayCell } from '@/lib/calendar';
import { isWeekend } from '@/lib/dates';
import type { Country, HolidayMap, OtherCountry, Region } from '@/lib/holidays';
import { MAX_OTHERS } from '@/lib/storage';
import type { CountryPick } from '@/lib/types';
import { cn } from '@/lib/utils';

export type CompareStyle = 'off' | 'layers' | 'lanes';

function readStyle(): CompareStyle {
  if (typeof window === 'undefined') return 'off';
  const v = new URLSearchParams(window.location.search).get('compare');
  return v === 'layers' || v === 'lanes' ? v : 'off';
}

/** Which prototype the page runs, from ?compare= in the URL; 'off' is the app as released. */
export const COMPARE_STYLE: CompareStyle = readStyle();

// ---- Figures for the settings note.

export interface CompareCount {
  code: string;
  name: string;
  /** Public holidays there in the year. */
  holidays: number;
  /** Of those, the ones that fall on a public holiday of yours. */
  shared: number;
}

export function compareCounts(mine: HolidayMap, others: OtherCountry[], year: number): CompareCount[] {
  return others.map((o) => {
    const map = o.lookup(year);
    const dates = Object.keys(map);
    return { code: o.code, name: o.name, holidays: dates.length, shared: dates.filter((d) => !!mine[d]).length };
  });
}

/** "9 in Germany, 6 of them on the same days." to follow the count of your own holidays. */
export function compareNote(counts: CompareCount[]): string {
  return counts
    .map((c) => `${c.holidays} in ${c.name}, ${c.shared === 0 ? 'none' : c.shared === c.holidays ? 'all' : `${c.shared} of them`} on the same days.`)
    .join(' ');
}

// ---- The day: who is off.

export type CompareState = 'none' | 'mine' | 'theirs' | 'both';

export function compareState(c: DayCell): CompareState {
  const mine = !!c.holiday;
  const theirs = c.others.length > 0;
  return mine && theirs ? 'both' : mine ? 'mine' : theirs ? 'theirs' : 'none';
}

/** Days with the same key join into one pill across the week row, as the calendar bands do; '' never joins. */
export function compareBand(style: CompareStyle, c: DayCell | null | undefined): string {
  if (!c || c.kind === 'trip' || c.kind === 'draft') return '';
  const s = compareState(c);
  if (style === 'layers' && s !== 'none') return s;
  if (style === 'lanes' && s === 'both') return s;
  return isWeekend(c.key) ? 'w' : '';
}

/** "Easter Monday · Romania and Germany", "Whit Monday · Germany only", or each name when the two countries call the day differently. */
export function compareTip(c: DayCell, mine: string): string {
  if (c.holiday && c.others.length) {
    const same = c.others.every((o) => o.holiday === c.holiday);
    if (same) return `${c.holiday} · ${[mine, ...c.others.map((o) => o.name)].join(' and ')}`;
    return [`${c.holiday} (${mine})`, ...c.others.map((o) => `${o.holiday} (${o.name})`)].join(' · ');
  }
  if (c.holiday) return `${c.holiday} · ${mine} only`;
  return c.others.map((o) => `${o.holiday} · ${o.name} only`).join(' · ');
}

const HOLIDAY_BAND = 'bg-destructive/10 dark:bg-destructive/20';

function bandClass(style: CompareStyle, state: CompareState, weekend: boolean): string {
  if (style === 'layers') {
    if (state === 'mine') return HOLIDAY_BAND;
    if (state === 'theirs') return 'other-band';
    if (state === 'both') return 'shared-band';
  } else if (state === 'both') {
    return HOLIDAY_BAND;
  }
  return weekend ? 'bg-muted' : '';
}

function numberClass(state: CompareState, weekend: boolean): string {
  switch (state) {
    case 'mine':
      return 'font-semibold text-destructive';
    case 'theirs':
      return 'font-semibold text-other';
    case 'both':
      return 'font-semibold';
    default:
      return weekend ? 'text-muted-foreground' : '';
  }
}

interface CompareDayProps {
  style: CompareStyle;
  cell: DayCell;
  /** Your country's name, for the tooltip. */
  mine: string;
  joinLeft: boolean;
  joinRight: boolean;
  /** The tooltip of a day neither country is off: what a day of leave there is worth. */
  fallbackTip: string;
  onTapDay: (key: string) => void;
}

/** A day of the calendar view that is not a trip or the draft, drawn for the comparison. */
export function CompareDay({ style, cell, mine, joinLeft, joinRight, fallbackTip, onTapDay }: CompareDayProps) {
  const state = compareState(cell);
  const weekend = isWeekend(cell.key);
  const band = bandClass(style, state, weekend);
  const tip = compareTip(cell, mine) || fallbackTip;
  const button = (
    <button
      type="button"
      data-day={cell.key}
      aria-label={cell.aria}
      onClick={() => onTapDay(cell.key)}
      className={cn(
        'group relative grid h-8 min-w-0 place-items-center outline-none select-none',
        band,
        band && 'rounded-full',
        joinLeft && 'rounded-l-none',
        joinRight && 'rounded-r-none',
      )}
    >
      <span
        className={cn(
          'grid size-7 place-items-center rounded-full text-[13px] leading-none transition-shadow',
          'group-hover:ring-1 group-hover:ring-foreground/40 group-hover:ring-inset',
          'group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
          numberClass(state, weekend),
        )}
      >
        {cell.n}
      </span>
      {style === 'lanes' && state !== 'none' && <Lanes state={state} />}
    </button>
  );
  if (!tip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

/** Two lanes under the number, yours above theirs; the unlit one stays as a faint track so the position reads. */
function Lanes({ state }: { state: CompareState }) {
  return (
    <span aria-hidden="true" className="absolute inset-x-2.5 bottom-[3px] flex flex-col gap-px">
      <span className={cn('h-0.5 rounded-full', state === 'theirs' ? 'bg-foreground/10' : 'bg-destructive')} />
      <span className={cn('h-0.5 rounded-full', state === 'mine' ? 'bg-foreground/10' : 'bg-other')} />
    </span>
  );
}

// ---- The header legend.

interface LegendProps {
  style: CompareStyle;
  mine: string;
  others: OtherCountry[];
}

export function CompareLegend({ style, mine, others }: LegendProps) {
  const theirs = others.map((o) => o.name).join(', ');
  return (
    <>
      <Swatch className="bg-muted-foreground/20">Weekend</Swatch>
      {style === 'layers' ? (
        <>
          <Swatch className="bg-destructive/15">{mine}</Swatch>
          <Swatch className="other-band">{theirs}</Swatch>
          <Swatch className="shared-band">Both</Swatch>
        </>
      ) : (
        <>
          <Swatch className="bg-destructive/15">Both off</Swatch>
          <Swatch lane className="bg-destructive">
            {mine}
          </Swatch>
          <Swatch lane className="bg-other">
            {theirs}
          </Swatch>
        </>
      )}
    </>
  );
}

function Swatch({ className, lane, children }: { className: string; lane?: boolean; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('w-5 rounded-full', lane ? 'h-1' : 'h-3', className)} />
      {children}
    </span>
  );
}

// ---- Settings: the other country, in the two forms.

const NATIONWIDE = 'nationwide'; // the no-region option; region codes are '<country>-<subdivision>', so none can clash

interface OthersFieldProps {
  style: CompareStyle;
  others: CountryPick[];
  /** Your own country's code, which cannot be added again. */
  mine: string;
  /** Every country with data, or undefined while the rules load. */
  countries: Country[] | undefined;
  regionsOf: (country: string) => Region[];
  disabled: boolean;
  onChange: (others: CountryPick[]) => void;
}

export function OthersField(p: OthersFieldProps) {
  const nameOf = (code: string) => p.countries?.find((c) => c.code === code)?.name ?? code;
  const taken = [p.mine, ...p.others.map((o) => o.country)];
  const set = (i: number, pick: CountryPick) => p.onChange(p.others.map((o, j) => (j === i ? pick : o)));
  const remove = (i: number) => p.onChange(p.others.filter((_, j) => j !== i));
  const add = (country: string) => p.onChange([...p.others, { country, region: null }]);
  const canAdd = p.others.length < MAX_OTHERS;
  const regionOptions = (o: CountryPick) => {
    const regions = p.regionsOf(o.country);
    const known = !o.region || regions.some((r) => r.code === o.region);
    return [{ code: NATIONWIDE, name: 'Nationwide only' }, ...(known ? regions : [{ code: o.region!, name: o.region! }, ...regions])];
  };

  if (p.style === 'layers') {
    return (
      <div className="flex flex-col gap-2 pt-1">
        <span className={cn('text-sm font-medium leading-snug', p.disabled && 'opacity-50')}>Compare with</span>
        {p.others.map((o, i) => {
          const options = (p.countries ?? []).filter((c) => c.code === o.country || !taken.includes(c.code));
          if (!options.some((c) => c.code === o.country)) options.unshift({ code: o.country, name: o.country });
          const regions = regionOptions(o);
          return (
            <div key={o.country} className="flex flex-col gap-2">
              <div className="flex gap-1">
                <Combobox
                  aria-label="Country to compare with"
                  value={o.country}
                  options={options}
                  placeholder="Search country…"
                  empty={!p.countries ? 'Loading countries…' : 'No country found.'}
                  disabled={p.disabled}
                  className="min-w-0 flex-1"
                  onChange={(country) => set(i, { country, region: null })}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${nameOf(o.country)}`} disabled={p.disabled} onClick={() => remove(i)}>
                  <XIcon />
                </Button>
              </div>
              {regions.length > 1 && (
                <Combobox
                  aria-label={`Region of ${nameOf(o.country)}`}
                  value={o.region ?? NATIONWIDE}
                  options={regions}
                  placeholder="Search region…"
                  empty="No region found."
                  disabled={p.disabled}
                  onChange={(region) => set(i, { ...o, region: region === NATIONWIDE ? null : region })}
                />
              )}
            </div>
          );
        })}
        {canAdd && (
          <CountryPicker countries={p.countries} exclude={taken} onPick={add}>
            <Button type="button" variant="outline" disabled={p.disabled} className="w-full justify-start font-normal text-muted-foreground">
              <PlusIcon />
              Add a country
            </Button>
          </CountryPicker>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      <span className={cn('text-sm font-medium leading-snug', p.disabled && 'opacity-50')}>Compare with</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {p.others.map((o, i) => {
          const name = nameOf(o.country);
          const regions = regionOptions(o);
          const regionName = o.region ? regions.find((r) => r.code === o.region)?.name ?? o.region : '';
          const label = (
            <span className="flex items-center gap-1.5 pl-2 text-sm">
              <span aria-hidden="true" className="h-1 w-3 rounded-full bg-other" />
              {name}
              {regionName && <span className="text-muted-foreground">· {regionName}</span>}
            </span>
          );
          return (
            <span key={o.country} className={cn('inline-flex h-8 items-center gap-0.5 rounded-full border bg-background pr-0.5', p.disabled && 'opacity-50')}>
              {regions.length > 1 ? (
                <RegionPicker value={o.region ?? NATIONWIDE} options={regions} disabled={p.disabled} onPick={(region) => set(i, { ...o, region: region === NATIONWIDE ? null : region })}>
                  <button type="button" aria-label={`Region of ${name}`} disabled={p.disabled} className="rounded-full outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                    {label}
                  </button>
                </RegionPicker>
              ) : (
                label
              )}
              <Button type="button" variant="ghost" size="icon-xs" className="rounded-full" aria-label={`Remove ${name}`} disabled={p.disabled} onClick={() => remove(i)}>
                <XIcon />
              </Button>
            </span>
          );
        })}
        {canAdd && (
          <CountryPicker countries={p.countries} exclude={taken} onPick={add}>
            <Button type="button" variant="outline" size="icon-sm" className="rounded-full" aria-label="Add a country to compare with" disabled={p.disabled}>
              <PlusIcon />
            </Button>
          </CountryPicker>
        )}
        {p.others.length === 0 && <span className="text-xs text-muted-foreground">See the days off you share.</span>}
      </div>
    </div>
  );
}

interface CountryPickerProps {
  countries: Country[] | undefined;
  exclude: string[];
  onPick: (code: string) => void;
  /** The trigger. */
  children: ReactNode;
}

/** A searchable list of the countries not yet picked; a pick closes it. */
function CountryPicker({ countries, exclude, onPick, children }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList>
            <CommandEmpty>{!countries ? 'Loading countries…' : 'No country found.'}</CommandEmpty>
            <CommandGroup>
              {(countries ?? [])
                .filter((c) => !exclude.includes(c.code))
                .map((c) => (
                  <CommandItem
                    key={c.code}
                    value={`${c.name} ${c.code}`}
                    onSelect={() => {
                      onPick(c.code);
                      setOpen(false);
                    }}
                  >
                    {c.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface RegionPickerProps {
  value: string;
  options: Region[];
  disabled?: boolean;
  onPick: (code: string) => void;
  children: ReactNode;
}

/** The regions of a chip's country, opened from the chip itself. */
function RegionPicker({ value, options, disabled, onPick, children }: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search region…" />
          <CommandList>
            <CommandEmpty>No region found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.code}
                  value={`${o.name} ${o.code}`}
                  onSelect={() => {
                    onPick(o.code);
                    setOpen(false);
                  }}
                >
                  {o.name}
                  <CheckIcon className={cn('ml-auto', o.code === value ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
