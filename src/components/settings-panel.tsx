// The settings on the right: a column beside the calendar on wider screens, a sheet on phones, toggled from the Settings
// button in the header. Its content is the holidays, the country and region, the week start, the yearly allowance and the
// appearance.

import { CheckIcon, ChevronsUpDownIcon, MinusIcon, PlusIcon, Settings2Icon, XIcon } from 'lucide-react';
import { useState, type Ref, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { ThemeToggle } from '@/components/theme-toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { LoadStatus } from '@/lib/holidayStore';
import type { Country, Region } from '@/lib/holidays';
import type { Settings, WeekStart } from '@/lib/types';
import { cn } from '@/lib/utils';

const NATIONWIDE = 'nationwide'; // Radix Select keeps '' for its placeholder
const SUBTITLE = 'Public holidays, week start, your yearly allowance and the appearance.';

export const SETTINGS_ID = 'settings-panel';
const TITLE_ID = 'settings-panel-title';

/** The header button that opens and closes the panel; it stays in place at the header's right end. */
export function SettingsButton({ ref, open, onClick }: { ref?: Ref<HTMLButtonElement>; open: boolean; onClick: () => void }) {
  return (
    <Button ref={ref} variant="outline" aria-expanded={open} aria-controls={SETTINGS_ID} onClick={onClick}>
      <Settings2Icon />
      <span className="sr-only sm:not-sr-only">Settings</span>
    </Button>
  );
}

interface Props {
  isMobile: boolean;
  /** Open beside the calendar (wider screens). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open as a sheet (phones). */
  openMobile: boolean;
  onOpenMobileChange: (open: boolean) => void;
  /** The Settings button in the header, where focus goes back when the panel closes. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  settings: Settings;
  year: number;
  /** Every country with data, or undefined while the rules load. */
  countries: Country[] | undefined;
  /** The regions of the selected country whose holidays differ; [] when there are none. */
  regions: Region[];
  holidayCount: number;
  status: LoadStatus;
  onRetry: () => void;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsPanel({
  isMobile,
  open,
  onOpenChange,
  openMobile,
  onOpenMobileChange,
  triggerRef,
  settings,
  year,
  countries,
  regions,
  holidayCount,
  status,
  onRetry,
  onChange,
}: Props) {
  const known = !countries || countries.some((c) => c.code === settings.country);
  const countryOptions: Country[] = countries ? [...countries] : [];
  if (!known) countryOptions.unshift({ code: settings.country, name: settings.country });
  const regionOptions =
    settings.region && !regions.some((r) => r.code === settings.region) ? [{ code: settings.region, name: settings.region }, ...regions] : regions;
  const showRegion = settings.holidays && regionOptions.length > 0;

  let note: string;
  let noteIsError = false;
  if (!settings.holidays) {
    note = 'Turn on to mark public holidays and leave them out of your count.';
  } else if (status.error) {
    note = `Couldn’t load public holidays: ${status.error}.`;
    noteIsError = true;
  } else if (!status.loaded) {
    note = 'Loading public holidays…';
  } else if (!known) {
    note = `No holiday data for ${settings.country}; pick another country.`;
    noteIsError = true;
  } else {
    note = `${holidayCount} public ${holidayCount === 1 ? 'holiday' : 'holidays'} in ${year}.`;
    if (regions.length && !settings.region) note += ' Nationwide days only; pick a region for local ones.';
  }
  const canRetry = settings.holidays && !!status.error && !status.loading;

  const close = () => {
    if (isMobile) {
      // The sheet hands focus back to the Settings button itself as it closes (onCloseAutoFocus below).
      onOpenMobileChange(false);
      return;
    }
    onOpenChange(false);
    // The closed column is inert, so focus would drop to the page; it goes back to the Settings button instead.
    triggerRef.current?.focus();
  };

  // In the sheet the title and subtitle are the dialog's own, so it is announced by name; the column's landmark points
  // at the same heading. The subtitle keeps to one line and shows in full on hover.
  const titleClass = 'truncate text-sm font-semibold';
  const subtitleClass = 'truncate text-xs text-muted-foreground';
  const body = (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <div className="grid min-w-0 flex-1 leading-tight">
          {isMobile ? (
            <>
              <SheetTitle className={cn(titleClass, 'text-sidebar-foreground')}>Settings</SheetTitle>
              <SheetDescription className={subtitleClass} title={SUBTITLE}>
                {SUBTITLE}
              </SheetDescription>
            </>
          ) : (
            <>
              <h2 id={TITLE_ID} className={titleClass}>
                Settings
              </h2>
              <p className={subtitleClass} title={SUBTITLE}>
                {SUBTITLE}
              </p>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close settings" onClick={close}>
          <XIcon />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-3 pb-4">
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
              loading={!countries && status.loading}
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
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
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

          <FieldSeparator />

          <Field>
            <FieldLabel id="settings-appearance">Appearance</FieldLabel>
            <ThemeToggle labelledBy="settings-appearance" />
            <FieldDescription>System follows your device.</FieldDescription>
          </Field>
        </FieldGroup>

        <p className="text-xs text-muted-foreground">
          Holiday data from{' '}
          <a className="underline underline-offset-4 hover:text-foreground" href="https://github.com/commenthol/date-holidays" target="_blank" rel="noreferrer">
            date-holidays
          </a>{' '}
          (CC BY-SA 3.0), computed in this browser.
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={onOpenMobileChange}>
        <SheetContent
          id={SETTINGS_ID}
          side="right"
          showCloseButton={false}
          className="w-[20rem] max-w-[88vw] gap-0 bg-sidebar p-0 text-sidebar-foreground"
          onCloseAutoFocus={(e) => {
            // The sheet has no Radix trigger to return to, so focus would drop to the page.
            e.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  // Closed, the column takes no room and is inert, so nothing in it can take focus.
  return (
    <aside
      id={SETTINGS_ID}
      aria-labelledby={TITLE_ID}
      data-state={open ? 'open' : 'closed'}
      inert={!open}
      className={cn('hidden shrink-0 overflow-hidden transition-[width,margin] duration-200 ease-linear md:block', open ? 'mr-2 w-(--settings-width)' : 'mr-0 w-0')}
    >
      <div className="my-2 h-[calc(100svh-1rem)] w-(--settings-width)">{body}</div>
    </aside>
  );
}

interface ComboboxProps {
  id: string;
  value: string;
  options: Country[];
  loading: boolean;
  disabled: boolean;
  onChange: (code: string) => void;
}

function CountryCombobox({ id, value, options, loading, disabled, onChange }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((c) => c.code === value);
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
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  {c.name}
                  <CheckIcon className={cn('ml-auto', c.code === value ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
