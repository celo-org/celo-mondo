// Axis helpers for the buyback charts: clean tick values, a domain that
// includes them, and the few x labels a daily series needs.

const TICK_MULTIPLES = [1, 2, 2.5, 5, 10];

/** The tick step that gives about `count` ticks with clean values over a range. */
export function niceStep(range: number, count: number): number {
  if (range <= 0) return 1;
  const raw = range / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const multiple = TICK_MULTIPLES.find((m) => m * magnitude >= raw) ?? 10;
  return multiple * magnitude;
}

export interface Domain {
  min: number;
  max: number;
  ticks: number[];
}

/**
 * The y domain for a series: tick values that read cleanly (0 / 500 / 1,000),
 * extended so every value fits. Magnitudes start at zero; a price keeps its
 * own range so its movement stays visible.
 */
export function niceDomain(values: number[], baseline: 'zero' | 'auto', count = 4): Domain {
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const min = baseline === 'zero' ? Math.min(0, lowest) : lowest;
  const max = baseline === 'zero' ? Math.max(0, highest) : highest;
  // A flat series still needs a visible band.
  const spread = max - min || Math.abs(max) || 1;
  const step = niceStep(spread, count);
  const floor = Math.floor(min / step) * step;
  const ceil = Math.ceil(max / step) * step;
  const domainMin = baseline === 'zero' && min === 0 ? 0 : floor;
  const domainMax = ceil === domainMin ? domainMin + step : ceil;
  const ticks: number[] = [];
  for (let tick = domainMin; tick <= domainMax + step / 1e6; tick += step) {
    ticks.push(Number(tick.toFixed(10)));
  }
  return { min: domainMin, max: domainMax, ticks };
}

export interface AxisTick {
  index: number;
  label: string;
}

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const MONTH_DAY = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const MAX_X_TICKS = 8;

/**
 * X labels for a series of UTC days: the first day of each month, or, when
 * the series is too short for that, about one label a week.
 */
export function dayTicks(days: string[]): AxisTick[] {
  const date = (day: string) => new Date(`${day}T00:00:00Z`);
  const months = days.flatMap((day, index) =>
    day.endsWith('-01') ? [{ index, label: MONTH.format(date(day)) }] : [],
  );
  const ticks =
    months.length >= 2
      ? months
      : days.flatMap((day, index) =>
          index % 7 === 0 ? [{ index, label: MONTH_DAY.format(date(day)) }] : [],
        );
  // Keep the labels apart: drop every other one until they fit.
  let every = 1;
  while (ticks.length / every > MAX_X_TICKS) every *= 2;
  return ticks.filter((_, i) => i % every === 0);
}

const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** Short axis figures: 1.2M, 450K, 0. */
export function compactNumber(value: number): string {
  return COMPACT.format(value);
}
