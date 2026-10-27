import { useEffect, useRef } from 'react';
import type { LoadStatus } from '../lib/holidayStore';
import type { NagerCountry } from '../lib/nager';
import type { Settings } from '../lib/types';
import { Minus, Plus } from './icons';

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
  onClose: () => void;
}

export function SettingsPopover({ settings, year, countries, countriesStatus, regions, holidayCount, status, onRetry, onChange, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  return (
    <div id="ap-settings" ref={panelRef} className="popover material" role="dialog" aria-label="Settings" tabIndex={-1}>
      <div className="popover-header">
        <h2>Settings</h2>
        <button className="text-button" type="button" onClick={onClose}>
          Done
        </button>
      </div>

      <div className="grouped settings-group">
        <div className="settings-row">
          <span id="ap-hol-label">Public Holidays</span>
          <button
            className="switch"
            type="button"
            role="switch"
            aria-checked={settings.holidays}
            aria-labelledby="ap-hol-label"
            onClick={() => onChange({ holidays: !settings.holidays })}
          >
            <span className="switch-track" aria-hidden="true">
              <span className="switch-knob" />
            </span>
          </button>
        </div>
        <span className="hairline" aria-hidden="true" />
        <label className="settings-row">
          <span className="settings-label">Country</span>
          <select
            className="field select"
            value={settings.country}
            disabled={!settings.holidays}
            onChange={(e) => onChange({ country: e.target.value, region: null })}
          >
            {countryOptions.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {showRegion && (
          <>
            <span className="hairline" aria-hidden="true" />
            <label className="settings-row">
              <span className="settings-label">Region</span>
              <select
                className="field select"
                value={settings.region ?? ''}
                onChange={(e) => onChange({ region: e.target.value || null })}
              >
                <option value="">Nationwide only</option>
                {regionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <p className={`settings-note${noteIsError ? ' settings-note-error' : ''}`} aria-live="polite">
        {note}
        {settings.holidays && countriesStatus.error && !countriesStatus.loaded && ' The country list could not be loaded either.'}
      </p>
      {settings.holidays && status.error && !status.loading && (
        <button className="text-button retry-button" type="button" onClick={onRetry}>
          Retry
        </button>
      )}

      <div className="grouped settings-group">
        <div className="settings-row settings-row-tall">
          <span id="ap-ws-label">Week Starts On</span>
          <div className="segmented" role="group" aria-labelledby="ap-ws-label">
            <button className="segment" type="button" aria-pressed={settings.weekStart === 'Monday'} onClick={() => onChange({ weekStart: 'Monday' })}>
              Monday
            </button>
            <button className="segment" type="button" aria-pressed={settings.weekStart === 'Sunday'} onClick={() => onChange({ weekStart: 'Sunday' })}>
              Sunday
            </button>
          </div>
        </div>
        <span className="hairline" aria-hidden="true" />
        <div className="settings-row settings-row-tall">
          <span id="ap-al-label">Days Off per Year</span>
          <div className="allowance" role="group" aria-labelledby="ap-al-label">
            <span className="allowance-value">{settings.allowance}</span>
            <div className="joined-stepper">
              <button
                className="icon-button"
                type="button"
                aria-label="Fewer days off"
                disabled={settings.allowance <= 0}
                onClick={() => onChange({ allowance: Math.max(0, settings.allowance - 1) })}
              >
                <Minus />
              </button>
              <span className="divider" aria-hidden="true" />
              <button
                className="icon-button"
                type="button"
                aria-label="More days off"
                disabled={settings.allowance >= 99}
                onClick={() => onChange({ allowance: Math.min(99, settings.allowance + 1) })}
              >
                <Plus />
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="settings-note settings-source">
        Holiday data by <a href="https://date.nager.at" target="_blank" rel="noreferrer">Nager.Date</a>, cached in this browser.
      </p>
    </div>
  );
}
