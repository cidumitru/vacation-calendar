import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type UIEvent,
} from 'react';
import type { DayCell, MonthModel, YearModel } from '../lib/calendar';

interface Props {
  years: YearModel[];
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onTapDay: (key: string) => void;
}

const HOVER_DELAY = 400; // ms before a help tag shows under the mouse
const PRESS_DELAY = 500; // ms a finger holds before the tag shows

export const Calendar = forwardRef<HTMLDivElement, Props>(function Calendar({ years, onScroll, onTapDay }, ref) {
  const tip = useDayTooltip();
  return (
    <>
      <div
        className="scroller"
        ref={ref}
        onScroll={(e) => {
          tip.onScroll();
          onScroll(e);
        }}
        onPointerOver={tip.onPointerOver}
        onPointerOut={tip.onPointerOut}
        onPointerDown={tip.onPointerDown}
        onPointerUp={tip.onPointerEnd}
        onPointerCancel={tip.onPointerEnd}
        onClickCapture={tip.onClickCapture}
        onContextMenu={tip.onContextMenu}
        onFocus={tip.onFocus}
        onBlur={tip.onBlur}
        onKeyDown={tip.onKeyDown}
      >
        {years.map((y) => (
          <YearSection key={y.y} model={y} onTapDay={onTapDay} />
        ))}
      </div>
      <DayTooltip tip={tip.current} />
    </>
  );
});

// Memoised on the cached year model: typing a trip name never re-renders a year.
const YearSection = memo(function YearSection({ model, onTapDay }: { model: YearModel; onTapDay: (key: string) => void }) {
  return (
    <section className="year" data-year={model.y} aria-label={model.label}>
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
      data-holiday={cell.holiday || undefined}
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

// ---------- Help tag: the holiday name on hover (delayed), keyboard focus (at once) or long press (touch).
// The click on a day keeps picking it; a long press shows the tag and swallows that one tap.

interface Tip {
  text: string;
  x: number; // anchor centre, viewport px
  top: number; // anchor top
  bottom: number; // anchor bottom
}

const SELECTOR = '.day[data-holiday]';

function dayOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(SELECTOR) : null;
}

function useDayTooltip() {
  const [current, setCurrent] = useState<Tip | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<HTMLElement | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const pressed = useRef(false); // a long press just showed the tag: swallow the click that follows

  const clearTimer = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    pending.current = null;
  };

  const hide = useCallback(() => {
    clearTimer();
    anchor.current = null;
    setCurrent(null);
  }, []);

  const show = useCallback((el: HTMLElement) => {
    const text = el.dataset.holiday;
    if (!text) return;
    const r = (el.querySelector('.day-num') ?? el).getBoundingClientRect();
    anchor.current = el;
    setCurrent({ text, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  }, []);

  // While a tag is up, any press elsewhere or a resize takes it down.
  useEffect(() => {
    if (!current) return;
    const onDocDown = (e: Event) => {
      if (!anchor.current || !anchor.current.contains(e.target as Node)) hide();
    };
    document.addEventListener('pointerdown', onDocDown, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('pointerdown', onDocDown, true);
      window.removeEventListener('resize', hide);
    };
  }, [current, hide]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Scrolling moves the anchor: a tag held by keyboard focus follows it (tabbing to an
  // off-screen day scrolls it into view); a hover tag simply goes away.
  const onScroll = () => {
    const el = anchor.current;
    if (el && document.activeElement === el) show(el);
    else if (el || pending.current) hide();
  };

  const onPointerOver = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = dayOf(e.target);
    if (!el || el === anchor.current || el === pending.current) return;
    clearTimer();
    if (anchor.current) hide();
    pending.current = el;
    timer.current = window.setTimeout(() => {
      pending.current = null;
      show(el);
    }, HOVER_DELAY);
  };

  const onPointerOut = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = dayOf(e.target);
    if (!el || (e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) return;
    if (el === pending.current) clearTimer();
    if (el === anchor.current) hide();
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pressed.current = false;
    if (e.pointerType === 'mouse') {
      hide(); // the click picks the day; the tag gets out of the way, as a Mac help tag does
      return;
    }
    clearTimer();
    const el = dayOf(e.target);
    if (!el) {
      hide();
      return;
    }
    pending.current = el;
    timer.current = window.setTimeout(() => {
      pending.current = null;
      pressed.current = true;
      show(el);
    }, PRESS_DELAY);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') clearTimer();
  };

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (pressed.current) {
      pressed.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    if (dayOf(e.target)) e.preventDefault(); // a long press is for the tag, not the browser menu
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const el = dayOf(e.target);
    if (!el) return;
    let keyboard = true;
    try {
      keyboard = el.matches(':focus-visible');
    } catch {
      /* old engine: treat every focus as keyboard focus */
    }
    if (keyboard) {
      clearTimer();
      show(el);
    }
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const el = dayOf(e.target);
    if (el && el === anchor.current) hide();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && anchor.current) hide();
  };

  return { current, hide, onScroll, onPointerOver, onPointerOut, onPointerDown, onPointerEnd, onClickCapture, onContextMenu, onFocus, onBlur, onKeyDown };
}

function DayTooltip({ tip }: { tip: Tip | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!tip || !el) {
      setPos(null);
      return;
    }
    const margin = 8;
    const gap = 6;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(margin, Math.min(window.innerWidth - margin - w, tip.x - w / 2));
    let top = tip.top - gap - h;
    if (top < margin) top = tip.bottom + gap; // no room above: sit below the day
    setPos({ left, top });
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={ref}
      className="day-tip"
      aria-hidden="true"
      style={{ left: pos?.left ?? tip.x, top: pos?.top ?? tip.top, visibility: pos ? 'visible' : 'hidden' }}
    >
      {tip.text}
    </div>
  );
}
