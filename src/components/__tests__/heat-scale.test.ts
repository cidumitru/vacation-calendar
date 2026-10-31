import { describe, expect, it } from 'vitest';
import { heatLevel } from '@/components/heat-scale';

describe('Heat map levels', () => {
  it('keeps anything below two and a half bare, then climbs three steps: under 4, 4 to 5, more than 5', () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(0);
    expect(heatLevel(2.2)).toBe(0); // a five-day block that only reaches back to a holiday
    expect(heatLevel(2.4)).toBe(0);
    expect(heatLevel(2.5)).toBe(1); // the Christmas week, 10 days off for 4
    expect(heatLevel(3)).toBe(1); // a chain as good per day as a long weekend
    expect(heatLevel(3.5)).toBe(1); // 7 for 2 around New Year 2027
    expect(heatLevel(4)).toBe(2); // the Thursday before a Friday holiday
    expect(heatLevel(5)).toBe(2);
    expect(heatLevel(6)).toBe(3);
    expect(heatLevel(7)).toBe(3); // a Monday between New Year and Epiphany
  });
});
