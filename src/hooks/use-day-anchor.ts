import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

/** What Radix measures to place a popover on a day; the cell as contextElement lets the position follow the scroller. */
export interface DayAnchor {
  getBoundingClientRect: () => DOMRect;
  contextElement?: Element;
}

/**
 * The calendar cell of a day ('YYYY-MM-DD', found by its data-day attribute inside the scroller) as a virtual anchor
 * for a Radix popover: `cellEl` is null until the day is rendered, and `anchorRef` is what PopoverAnchor's virtualRef
 * takes. The lookup runs again whenever `mountedYears` changes, so a day in a year that was not on screen yet is found
 * once its year mounts.
 */
export function useDayAnchor(key: string, scrollerRef: RefObject<HTMLDivElement | null>, mountedYears: string) {
  const [cellEl, setCellEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setCellEl(key ? (scrollerRef.current?.querySelector<HTMLElement>(`[data-day="${key}"]`) ?? null) : null);
  }, [key, mountedYears, scrollerRef]);
  const anchor = useMemo<DayAnchor | null>(
    () => (cellEl ? { getBoundingClientRect: () => cellEl.getBoundingClientRect(), contextElement: cellEl } : null),
    [cellEl],
  );
  const anchorRef = useRef<DayAnchor | null>(null);
  anchorRef.current = anchor;
  return { cellEl, anchorRef };
}
