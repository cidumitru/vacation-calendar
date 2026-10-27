import { useLayoutEffect, useRef, useState, type RefObject, type UIEvent } from 'react';

const EDGE = 500; // px from either end of the scroller that loads another year

const reduceMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export interface YearScroller {
  /** The year in view: the last section whose top has passed the reading line. */
  year: number;
  /** The range of years currently rendered. */
  yFrom: number;
  yTo: number;
  ref: RefObject<HTMLDivElement | null>;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  jumpTo: (y: number, smooth: boolean) => void;
}

/**
 * An endless, vertically scrolling list of year sections (`[data-year]`): years are added at
 * either end as the scroller nears it, prepends keep the view still, and jumps scroll to a year.
 */
export function useYearScroller(start: number, min: number, max: number): YearScroller {
  const [year, setYear] = useState(start);
  const [yFrom, setYFrom] = useState(Math.max(min, start - 1));
  const [yTo, setYTo] = useState(Math.min(max, start + 1));

  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const jumpingRef = useRef(false);
  const jumpTimer = useRef<number | undefined>(undefined);
  const anchorRef = useRef<{ h: number; t: number } | null>(null);
  const jumpRef = useRef<{ y: number; smooth: boolean } | null>(null);
  const initTopRef = useRef<number | null>(null);

  const setJumping = (ms: number) => {
    jumpingRef.current = true;
    window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => {
      jumpingRef.current = false;
    }, ms);
  };

  // Open on the start year, and again once webfonts settle unless the person already scrolled.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const go = () => {
      const sec = el.querySelector<HTMLElement>(`[data-year="${start}"]`);
      if (!sec) return;
      setJumping(300);
      el.scrollTop = sec.offsetTop;
      initTopRef.current = el.scrollTop;
    };
    go();
    let cancelled = false;
    try {
      document.fonts?.ready.then(() => {
        if (!cancelled && initTopRef.current != null && el.scrollTop === initTopRef.current) go();
      });
    } catch {
      /* no Font Loading API */
    }
    return () => {
      cancelled = true;
      window.clearTimeout(jumpTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After every render: keep the view still across a prepend, then carry out a pending jump.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (anchorRef.current) {
      el.scrollTop = anchorRef.current.t + (el.scrollHeight - anchorRef.current.h);
      anchorRef.current = null;
    }
    busyRef.current = false;
    if (jumpRef.current) {
      const sec = el.querySelector<HTMLElement>(`[data-year="${jumpRef.current.y}"]`);
      if (sec) {
        const behavior = jumpRef.current.smooth && !reduceMotion() ? 'smooth' : 'auto';
        try {
          el.scrollTo({ top: sec.offsetTop, behavior });
        } catch {
          el.scrollTop = sec.offsetTop;
        }
      }
      jumpRef.current = null;
    }
  });

  const syncActive = (el: HTMLDivElement) => {
    if (jumpingRef.current) return;
    const secs = el.querySelectorAll<HTMLElement>('[data-year]');
    const line = el.getBoundingClientRect().top + Math.min(160, el.clientHeight * 0.3);
    let act: number | null = null;
    secs.forEach((s) => {
      if (s.getBoundingClientRect().top <= line) act = Number(s.dataset.year);
    });
    if (act == null && secs.length) act = Number(secs[0].dataset.year);
    if (act != null && act !== year) setYear(act);
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    syncActive(el);
    if (busyRef.current || jumpingRef.current) return;
    if (el.scrollTop < EDGE && yFrom > min) {
      busyRef.current = true;
      anchorRef.current = { h: el.scrollHeight, t: el.scrollTop };
      setYFrom(yFrom - 1);
    } else if (el.scrollTop + el.clientHeight > el.scrollHeight - EDGE && yTo < max) {
      busyRef.current = true;
      setYTo(yTo + 1);
    }
  };

  const jumpTo = (y: number, smooth: boolean) => {
    if (y < min || y > max) return;
    let prepended = false;
    if (y - 1 < yFrom) {
      setYFrom(Math.max(min, y - 1));
      prepended = true;
    }
    if (y + 1 > yTo) setYTo(Math.min(max, y + 1));
    setYear(y);
    jumpRef.current = { y, smooth: smooth && !prepended };
    setJumping(900);
  };

  return { year, yFrom, yTo, ref, onScroll, jumpTo };
}
