import { describe, expect, it } from 'vitest';
import { compactNumber, dayTicks, niceDomain, niceStep } from './scales';

const daysFrom = (first: string, count: number) =>
  Array.from({ length: count }, (_, i) =>
    new Date(Date.parse(`${first}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10),
  );

describe('niceStep', () => {
  it.each([
    [1000, 4, 250],
    [678_037, 4, 200_000],
    [0.04, 4, 0.01],
    [7, 4, 2],
    [0, 4, 1],
  ])('turns a range of %s into a clean step for %s ticks (%s)', (range, count, step) => {
    expect(niceStep(range, count)).toBeCloseTo(step, 10);
  });
});

describe('niceDomain', () => {
  it('starts magnitudes at zero and ends at a clean tick above the maximum', () => {
    expect(niceDomain([120, 4_310, 2_200], 'zero')).toEqual({
      min: 0,
      max: 6_000,
      ticks: [0, 2_000, 4_000, 6_000],
    });
    expect(niceDomain([678_037], 'zero').ticks).toEqual([0, 200_000, 400_000, 600_000, 800_000]);
  });

  it('keeps zero inside the domain when a value is negative', () => {
    const { min, max, ticks } = niceDomain([-300, 1_200], 'zero');
    expect(min).toBe(-500);
    expect(max).toBe(1_500);
    expect(ticks).toContain(0);
  });

  it('lets a price keep its own range so its movement stays visible', () => {
    const { min, max, ticks } = niceDomain([0.071, 0.105, 0.083], 'auto');
    expect(min).toBeCloseTo(0.07, 10);
    expect(max).toBeCloseTo(0.11, 10);
    expect(ticks).toEqual([0.07, 0.08, 0.09, 0.1, 0.11]);
  });

  it('gives a flat series a visible band', () => {
    const flat = niceDomain([5, 5, 5], 'zero');
    expect(flat.min).toBe(0);
    expect(flat.max).toBeGreaterThan(5);
    const flatPrice = niceDomain([0.1, 0.1], 'auto');
    expect(flatPrice.max).toBeGreaterThan(flatPrice.min);
  });
});

describe('dayTicks', () => {
  it('labels the first day of each month across a long series', () => {
    const ticks = dayTicks(daysFrom('2026-04-09', 180));
    expect(ticks.map((t) => t.label)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    expect(ticks[0].index).toBe(22);
  });

  it('labels about one day a week when the series spans less than two month starts', () => {
    const ticks = dayTicks(daysFrom('2026-04-09', 20));
    expect(ticks.map((t) => t.label)).toEqual(['Apr 9', 'Apr 16', 'Apr 23']);
  });

  it('thins the labels so they stay apart on a very long series', () => {
    const ticks = dayTicks(daysFrom('2026-01-01', 720));
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks[0].label).toBe('Jan');
  });
});

describe('compactNumber', () => {
  it.each([
    [0, '0'],
    [1_500, '1.5K'],
    [678_037, '678K'],
    [7_571_214, '7.6M'],
  ])('shortens %s to %s', (value, text) => {
    expect(compactNumber(value)).toBe(text);
  });
});
