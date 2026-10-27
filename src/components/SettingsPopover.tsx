import { useEffect, useRef } from 'react';
import { COUNTRIES } from '../lib/holidays';
import type { CountryCode, Settings } from '../lib/types';
import { Minus, Plus } from './icons';

interface Props {
  settings: Settings;
  note: string;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

export function SettingsPopover({ settings, note, onChange, onClose }: Props) {
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
          <span className="settings-label">Country or Region</span>
          <select
            className="field select"
            value={settings.country}
            disabled={!settings.holidays}
            onChange={(e) => onChange({ country: e.target.value as CountryCode })}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="settings-note">{note}</p>

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
    </div>
  );
}
