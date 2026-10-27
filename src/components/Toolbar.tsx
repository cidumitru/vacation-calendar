import type { RefObject } from 'react';
import { ChevronLeft, ChevronRight, Sliders } from './icons';

interface Props {
  year: number;
  onPrev: () => void;
  onNext: () => void;
  holidaysOn: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  settingsButtonRef: RefObject<HTMLButtonElement>;
}

export function Toolbar(p: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="stepper" role="group" aria-label="Change year">
          <button className="icon-button" type="button" aria-label="Previous year" onClick={p.onPrev}>
            <ChevronLeft />
          </button>
          <button className="icon-button" type="button" aria-label="Next year" onClick={p.onNext}>
            <ChevronRight />
          </button>
        </div>
        <h1 className="toolbar-year">{p.year}</h1>
      </div>
      <div className="toolbar-right">
        <div className="legend">
          <span className="legend-item">
            <span className="legend-swatch legend-weekend" aria-hidden="true" />
            Weekend
          </span>
          {p.holidaysOn && (
            <span className="legend-item">
              <span className="legend-swatch legend-holiday" aria-hidden="true" />
              Holiday
            </span>
          )}
          <span>Scroll for other years</span>
        </div>
        <button
          ref={p.settingsButtonRef}
          className="settings-button"
          type="button"
          aria-expanded={p.settingsOpen}
          aria-controls="ap-settings"
          onClick={p.onToggleSettings}
        >
          <Sliders />
          Settings
        </button>
      </div>
    </div>
  );
}
