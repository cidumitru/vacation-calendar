import { describe, expect, it } from 'vitest';
import { heatLevel } from '@/components/heat-scale';

describe('Heat map levels', () => {
  it('keeps up to 2 bare, fades a regular long weekend and ramps up from there', () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(0);
    expect(heatLevel(1.8)).toBe(0); // a plain midweek day, at best inside a full week
    expect(heatLevel(2)).toBe(0); // a Tuesday paired with its Monday
    expect(heatLevel(2.5)).toBe(1); // Christmas week bridge days
    expect(heatLevel(3)).toBe(1); // a regular Monday or Friday
    expect(heatLevel(3.5)).toBe(2);
    expect(heatLevel(4)).toBe(2);
    expect(heatLevel(5)).toBe(3);
    expect(heatLevel(7)).toBe(4);
  });
});
