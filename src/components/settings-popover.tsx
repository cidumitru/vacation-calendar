import { CheckIcon, ChevronsUpDownIcon, MinusIcon, PlusIcon, Settings2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { LoadStatus } from '@/lib/holidayStore';
import type { NagerCountry } from '@/lib/nager';
import type { Settings, WeekStart } from '@/lib/types';
import { cn } from '@/lib/utils';

const NATIONWIDE = 'nationwide'; // Radix Select keeps '' for its placeholder

interface Props {
  settings: Settings;
  year: number;
  countries: NagerCountry[] | undefined;
  countriesStatus: LoadStatus;
  regions: string[];
  holidayCount: number;
  status: LoadStatus;
  onRetry: () => void;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsPopover({ settings, year, countries, countriesStatus, regions, holidayCount, status, onRetry, onChange }: Props) {
  const countryOptions: NagerCountry[] = countries ? [...countries] : [];
  if (!countryOptions.some((c) => c.countryCode === settings.country)) {
    countryOptions.unshift({ countryCode: settings.country, name: settings.country });
  }
  const regionOptions = settings.region && !regions.includes(settings.region) ? [settings.region, ...regions] : regions;
  const showRegion = settings.holidays && regionOptions.length > 0;

  let note: string;
  let noteIsError = false;
  if (!settings.holidays) {
    note = 'Turn on to mark public holidays and leave them out of your count.';
  } else if (status.error && !status.loaded) {
    note = `Couldn’t load public holidays for ${year}: ${status.error}.`;
    noteIsError = true;
  } else if (!status.loaded) {
    note = 'Loading public holidays…';
  } else {
    note = `${holidayCount} public ${holidayCount === 1 ? 'holiday' : 'holidays'} in ${year}.`;
    if (regions.length && !settings.region) note += ' Nationwide days only; pick a region for local ones.';
    if (status.error) note += ' Showing a saved copy; the refresh failed.';
  }
  if (settings.holidays && countriesStatus.error && !countriesStatus.loaded) note += ' The country list could not be loaded either.';
  const canRetry = settings.holidays && (status.error || countriesStatus.error) && !status.loading && !countriesStatus.loading;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Settings2Icon />
          <span className="sr-only sm:not-sr-only">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)]">
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
          <PopoverDescription>Public holidays, week start and your yearly allowance.</PopoverDescription>
        </PopoverHeader>

        <FieldGroup className="gap-5">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="settings-holidays">Public holidays</FieldLabel>
              <FieldDescription>Marked in the calendar and free of charge.</FieldDescription>
            </FieldContent>
            <Switch id="settings-holidays" checked={settings.holidays} onCheckedChange={(v) => onChange({ holidays: v })} />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-country">Country</FieldLabel>
            <CountryCombobox
              id="settings-country"
              value={settings.country}
              options={countryOptions}
              loading={!countries && countriesStatus.loading}
              disabled={!settings.holidays}
              onChange={(country) => onChange({ country, region: null })}
            />
            {showRegion && (
              <Select value={settings.region ?? NATIONWIDE} onValueChange={(v) => onChange({ region: v === NATIONWIDE ? null : v })}>
                <SelectTrigger className="w-full" aria-label="Region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NATIONWIDE}>Nationwide only</SelectItem>
                  {regionOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FieldDescription aria-live="polite" className={cn(noteIsError && 'text-destructive')}>
              {note}
            </FieldDescription>
            {canRetry && (
              <Button type="button" variant="link" size="sm" className="h-auto w-fit p-0" onClick={onRetry}>
                Retry
              </Button>
            )}
          </Field>

          <FieldSeparator />

          <Field orientation="horizontal">
            <FieldLabel id="settings-week-start">Week starts on</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              aria-labelledby="settings-week-start"
              value={settings.weekStart}
              onValueChange={(v) => {
                if (v) onChange({ weekStart: v as WeekStart });
              }}
            >
              <ToggleGroupItem value="Monday" className="px-3">
                Monday
              </ToggleGroupItem>
              <ToggleGroupItem value="Sunday" className="px-3">
                Sunday
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel id="settings-allowance">Days off per year</FieldLabel>
            <ButtonGroup aria-labelledby="settings-allowance">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Fewer days off"
                disabled={settings.allowance <= 0}
                onClick={() => onChange({ allowance: Math.max(0, settings.allowance - 1) })}
              >
                <MinusIcon />
              </Button>
              <ButtonGroupText className="w-11 justify-center tabular-nums" aria-live="polite">
                {settings.allowance}
              </ButtonGroupText>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="More days off"
                disabled={settings.allowance >= 99}
                onClick={() => onChange({ allowance: Math.min(99, settings.allowance + 1) })}
              >
                <PlusIcon />
              </Button>
            </ButtonGroup>
          </Field>
        </FieldGroup>

        <p className="text-xs text-muted-foreground">
          Holiday data by{' '}
          <a className="underline underline-offset-4 hover:text-foreground" href="https://date.nager.at" target="_blank" rel="noreferrer">
            Nager.Date
          </a>
          , cached in this browser.
        </p>
      </PopoverContent>
    </Popover>
  );
}

interface ComboboxProps {
  id: string;
  value: string;
  options: NagerCountry[];
  loading: boolean;
  disabled: boolean;
  onChange: (code: string) => void;
}

function CountryCombobox({ id, value, options, loading, disabled, onChange }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((c) => c.countryCode === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between font-normal">
          <span className="truncate">{current?.name ?? value}</span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList>
            <CommandEmpty>{loading ? 'Loading countries…' : 'No country found.'}</CommandEmpty>
            <CommandGroup>
              {options.map((c) => (
                <CommandItem
                  key={c.countryCode}
                  value={`${c.name} ${c.countryCode}`}
                  onSelect={() => {
                    onChange(c.countryCode);
                    setOpen(false);
                  }}
                >
                  {c.name}
                  <CheckIcon className={cn('ml-auto', c.countryCode === value ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
