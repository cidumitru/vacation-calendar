import type { FormEvent } from 'react';
import type { Draft } from '../lib/types';
import { MinusCircle } from './icons';

export interface TripRow {
  id: string;
  name: string;
  color: string;
  range: string;
  off: string;
}

export interface Segment {
  width: string;
  color: string;
}

export type HintKind = 'default' | 'draft' | 'error';

interface Props {
  year: number;
  allowance: number;
  used: number;
  holidaysOn: boolean;
  segments: Segment[];
  draft: Draft;
  onDraftChange: (patch: Partial<Draft>) => void;
  onClear: () => void;
  onAdd: (e: FormEvent<HTMLFormElement>) => void;
  hint: string;
  hintKind: HintKind;
  trips: TripRow[];
  onRemove: (id: string) => void;
}

export function Sidebar(p: Props) {
  const left = Math.abs(p.allowance - p.used);
  const hasDraft = !!(p.draft.name || p.draft.from || p.draft.to);
  return (
    <aside className="sidebar">
      <section className="sidebar-group" aria-labelledby="summary-h">
        <h2 id="summary-h" className="section-header">Summary</h2>
        <div className="summary-card">
          <p className="summary-title">Days left in {p.year}</p>
          <p className="summary-number">
            <strong>{left}</strong>
            <span>{p.used > p.allowance ? 'over' : 'of'} {p.allowance}</span>
          </p>
          <div className="progress" aria-hidden="true">
            {p.segments.map((s, i) => (
              <span key={i} style={{ width: s.width, background: s.color }} />
            ))}
          </div>
          <p className="caption">
            {p.used} of {p.allowance} days planned. {p.holidaysOn ? 'Weekends and public holidays are free.' : 'Weekends are free.'}
          </p>
        </div>
      </section>

      <form className="sidebar-group" onSubmit={p.onAdd} aria-labelledby="new-trip-h">
        <h2 id="new-trip-h" className="section-header">New Trip</h2>
        <div className="grouped">
          <label className="form-row">
            Name
            <input
              className="field"
              type="text"
              placeholder="Summer"
              value={p.draft.name}
              onChange={(e) => p.onDraftChange({ name: e.target.value })}
              autoComplete="off"
            />
          </label>
          <span className="hairline" aria-hidden="true" />
          <label className="form-row">
            From
            <input
              className="field field-date"
              type="date"
              value={p.draft.from}
              onChange={(e) => p.onDraftChange({ from: e.target.value })}
            />
          </label>
          <span className="hairline" aria-hidden="true" />
          <label className="form-row">
            To
            <input
              className="field field-date"
              type="date"
              value={p.draft.to}
              onChange={(e) => p.onDraftChange({ to: e.target.value })}
            />
          </label>
        </div>
        <p className={`hint${p.hintKind === 'draft' ? ' hint-draft' : p.hintKind === 'error' ? ' hint-error' : ''}`} aria-live="polite">
          {p.hint}
        </p>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={!p.draft.from}>
            Add Trip
          </button>
          {hasDraft && (
            <button className="fill-button" type="button" onClick={p.onClear}>
              Clear
            </button>
          )}
        </div>
      </form>

      <section className="sidebar-group trip-list" aria-labelledby="trips-h">
        <h2 id="trips-h" className="section-header">Trips in {p.year}</h2>
        {p.trips.length === 0 && <p className="empty">No trips yet.</p>}
        {p.trips.map((t) => (
          <div className="trip-row" key={t.id}>
            <span className="trip-dot" aria-hidden="true" style={{ background: t.color }} />
            <div className="trip-text">
              <span className="trip-name">{t.name}</span>
              <span className="trip-range">{t.range}</span>
            </div>
            <span className="trip-off">{t.off}</span>
            <button className="icon-button trip-remove" type="button" aria-label={`Remove ${t.name}`} onClick={() => p.onRemove(t.id)}>
              <MinusCircle />
            </button>
          </div>
        ))}
      </section>

      <p className="sidebar-footer">Trips and settings are saved in this browser. No account, no server.</p>
    </aside>
  );
}
