export const ACCENT = '#0071E3'; // alternatives: #8944AB, #D6336C, #5E5E63

/** New trips take the next colour in this order: palette[trips.length % 4]. */
export const PALETTE = ['#0A7D8C', '#5856D6', '#D6336C', '#B35300'];

export interface Tone {
  tint: string; // band tint
  ink: string; // ink on tint
}

const TONES: Record<string, Tone> = {
  '#0A7D8C': { tint: 'rgba(10, 125, 140, 0.16)', ink: '#075E69' },
  '#5856D6': { tint: 'rgba(88, 86, 214, 0.16)', ink: '#3634A3' },
  '#D6336C': { tint: 'rgba(214, 51, 108, 0.15)', ink: '#A3214F' },
  '#B35300': { tint: 'rgba(179, 83, 0, 0.15)', ink: '#8A4000' },
};

function channels(hex: string): [number, number, number] | null {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  const c = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16));
  if (c.some((v) => Number.isNaN(v))) return null;
  return [c[0], c[1], c[2]];
}

export function hexA(hex: string, alpha: number): string {
  const c = channels(hex) ?? [0, 113, 227];
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

export function darken(hex: string, factor: number): string {
  const c = channels(hex);
  if (!c) return '#0066CC';
  return '#' + c.map((v) => Math.round(v * factor).toString(16).padStart(2, '0')).join('');
}

export function tone(color: string): Tone {
  return TONES[color] ?? { tint: hexA(color, 0.16), ink: darken(color, 0.7) };
}

/** Text colour for the accent: #0066CC for the default, else accent × 0.85 per channel. */
export function accentText(accent: string): string {
  return accent === '#0071E3' ? '#0066CC' : darken(accent, 0.85);
}
