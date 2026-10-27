import { forwardRef, memo, type UIEvent } from 'react';
import type { DayCell, MonthModel, YearModel } from '../lib/calendar';

interface Props {
  years: YearModel[];
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onTapDay: (key: string) => void;
}

export const Calendar = forwardRef<HTMLDivElement, Props>(function Calendar({ years, onScroll, onTapDay }, ref) {
  return (
    <div className="scroller" ref={ref} onScroll={onScroll}>
      {years.map((y) => (
        <YearSection key={y.y} model={y} onTapDay={onTapDay} />
      ))}
    </div>
  );
});

// Memoised on the cached year model: typing a trip name never re-renders a year.
const YearSection = memo(function YearSection({ model, onTapDay }: { model: YearModel; onTapDay: (key: string) => void }) {
  return (
    <section className="year" data-year={model.y} aria-label={model.label}>
      <div className="year-header material">
        <h2>{model.y}</h2>
        <span className="year-summary">{model.summary}</span>
      </div>
      <div className="months">
        {model.months.map((m) => (
          <Month key={m.name} model={m} weekdays={model.weekdays} onTapDay={onTapDay} />
        ))}
      </div>
    </section>
  );
});

function Month({ model, weekdays, onTapDay }: { model: MonthModel; weekdays: string[]; onTapDay: (key: string) => void }) {
  return (
    <section className="month" aria-label={model.label}>
      <div className="month-header">
        <h3>{model.name}</h3>
        <span className="month-off">{model.off}</span>
      </div>
      <div className="weekdays" aria-hidden="true">
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="days">
        {model.cells.map((c, i) => (c ? <Day key={c.key} cell={c} onTapDay={onTapDay} /> : <span key={`b${i}`} className="day day-blank" aria-hidden="true" />))}
      </div>
    </section>
  );
}

function Day({ cell, onTapDay }: { cell: DayCell; onTapDay: (key: string) => void }) {
  return (
    <button
      className="day"
      type="button"
      title={cell.title || undefined}
      aria-label={cell.aria}
      onClick={() => onTapDay(cell.key)}
      style={{ background: cell.bg, borderRadius: cell.radius }}
    >
      <span className="day-num" style={{ background: cell.cbg, color: cell.fg, fontWeight: cell.weight }}>
        {cell.n}
      </span>
      {cell.dot && <span className="day-dot" aria-hidden="true" style={{ background: cell.dot }} />}
    </button>
  );
}
