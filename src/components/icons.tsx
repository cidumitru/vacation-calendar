// Simple stroke icons from the prototype. No SF Symbols or other Apple artwork.

export function ChevronLeft() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.75 2.75L4.5 7l4.25 4.25" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.25 2.75L9.5 7l-4.25 4.25" />
    </svg>
  );
}

export function Sliders() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 5h7.5M14 5h1.5M2.5 13h1.5M8 13h7.5" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="6" cy="13" r="2" />
    </svg>
  );
}

export function MinusCircle() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.25 8h5.5" strokeLinecap="round" />
    </svg>
  );
}

export function Minus() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M2.5 6h7" />
    </svg>
  );
}

export function Plus() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 2.5v7M2.5 6h7" />
    </svg>
  );
}
