import { useRef, useState, type CSSProperties, type TouchEvent } from 'react';

/** Past this many pixels of downward drag, letting go dismisses. */
const DISMISS_AT = 72;

/**
 * Swipe-down to dismiss for a sheet docked at the bottom: the sheet follows the finger while it is dragged down, and
 * letting go past DISMISS_AT calls onDismiss; a shorter drag springs back. Spread `handlers` on the element to drag
 * by and give the sheet `style`.
 */
export function useDragDown(onDismiss: () => void) {
  const [dy, setDy] = useState(0);
  const startY = useRef<number | null>(null);
  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      startY.current = e.touches[0]?.clientY ?? null;
    },
    onTouchMove: (e: TouchEvent) => {
      if (startY.current == null) return;
      setDy(Math.max(0, (e.touches[0]?.clientY ?? startY.current) - startY.current));
    },
    onTouchEnd: () => {
      if (dy > DISMISS_AT) onDismiss();
      startY.current = null;
      setDy(0);
    },
  };
  const style: CSSProperties | undefined = dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined;
  return { handlers: { ...handlers, onTouchCancel: handlers.onTouchEnd }, style, dragging: dy > 0 };
}
