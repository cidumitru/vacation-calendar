import { describe, expect, it } from 'vitest';
import { heatLevel } from '@/components/heat-scale';

describe('Heat map levels', () => {
  it('keeps a plain day bare, fades a regular long weekend and ramps up the bridge days', () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(0);
    expect(heatLevel(2)).toBe(1);
    expect(heatLevel(3)).toBe(1); // a regular Monday or Friday
    expect(heatLevel(4)).toBe(2);
    expect(heatLevel(5)).toBe(3);
    expect(heatLevel(6)).toBe(4);
    expect(heatLevel(9)).toBe(4);
  });
});
