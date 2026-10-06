'use client';

import { KeyboardEvent, PointerEvent, useRef, useState } from 'react';
import {
  compactNumber,
  daysInMonth,
  monthLongLabel,
  monthShortLabel,
  niceDomain,
} from 'src/features/buyback/charts/scales';
import {
  AXIS,
  barPath,
  GRID,
  MARGIN,
  MAX_BAR_WIDTH,
  PLOT_HEIGHT,
  Tooltip,
  useContainerWidth,
} from 'src/features/buyback/charts/TimeSeriesChart';
import { usd } from 'src/features/buyback/format';
import { FeesByCurrencyUsd, MonthlyStats } from 'src/features/buyback/types';

// Fixed order (bottom to top) and colours; this set clears 3:1 on white and
// stays distinguishable under every colour-vision deficiency (validated).
export const CURRENCY_SERIES: Array<{ key: keyof FeesByCurrencyUsd; name: string; color: string }> =
  [
    { key: 'CELO', name: 'CELO', color: '#20A144' },
    { key: 'USDT', name: 'USDT', color: '#2563eb' },
    { key: 'USDC', name: 'USDC', color: '#ea580c' },
    { key: 'USDm', name: 'USDm', color: '#9333ea' },
    { key: 'EURm', name: 'EURm', color: '#db2777' },
    { key: 'other', name: 'Other', color: '#a16207' },
  ];

const SEGMENT_GAP = 2;
const BAR_PADDING = 8;

const monthTotal = (fees: FeesByCurrencyUsd) =>
  CURRENCY_SERIES.reduce((sum, series) => sum + Math.max(0, fees[series.key]), 0);

/** Fees per calendar month, stacked by the currency they were paid in. */
export function MonthlyStackedChart({ months }: { months: MonthlyStats[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const [selected, setSelected] = useState<number | null>(null);

  const count = months.length;
  const last = count - 1;
  const totals = months.map((m) => monthTotal(m.feesByCurrencyUsd));
  const height = MARGIN.top + PLOT_HEIGHT + MARGIN.bottom;
  const plotLeft = MARGIN.left;
  const plotRight = width - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = MARGIN.top + PLOT_HEIGHT;
  const step = (plotRight - plotLeft) / Math.max(count, 1);
  const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, step - BAR_PADDING));
  const domain = niceDomain(totals.length > 0 ? totals : [0], 'zero');
  const xOf = (index: number) => plotLeft + (index + 0.5) * step;
  const yOf = (value: number) => plotBottom - (value / (domain.max - domain.min)) * PLOT_HEIGHT;
  const indexAt = (px: number) => Math.min(last, Math.max(0, Math.floor((px - plotLeft) / step)));

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (count === 0) return;
    const { left } = event.currentTarget.getBoundingClientRect();
    setSelected(indexAt(event.clientX - left));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, (current: number) => number> = {
      ArrowLeft: (current) => Math.max(0, current - 1),
      ArrowRight: (current) => Math.min(last, current + 1),
      Home: () => 0,
      End: () => last,
    };
    if (event.key === 'Escape') {
      setSelected(null);
    } else if (moves[event.key] && count > 0) {
      event.preventDefault();
      setSelected(moves[event.key](selected ?? last));
    }
  };

  const tooltipRows = (index: number) => {
    const month = months[index];
    const full = daysInMonth(month.month);
    return [
      ...CURRENCY_SERIES.map((series) => ({
        value: usd(month.feesByCurrencyUsd[series.key]),
        label: series.name,
      })),
      { value: usd(totals[index]), label: 'total' },
      ...(month.days < full ? [{ value: `${month.days} of ${full}`, label: 'days' }] : []),
    ];
  };

  return (
    <figure className="border border-taupe-300 bg-white p-4">
      <figcaption>
        <div className="text-sm font-medium">Fees by currency, per month</div>
        <div className="text-xs text-taupe-600">
          USD value of sequencer fees by the currency they were paid in
        </div>
      </figcaption>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
        {CURRENCY_SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: series.color }}
            />
            {series.name}
          </li>
        ))}
      </ul>
      <div
        ref={containerRef}
        role="img"
        aria-label={
          count > 0
            ? `Fees by currency, per month, ${monthLongLabel(months[0].month)} to ${monthLongLabel(months[last].month)}, latest ${usd(totals[last])}`
            : 'Fees by currency, per month, no data'
        }
        tabIndex={0}
        className="relative mt-2 outline-none focus-visible:ring-1 focus-visible:ring-taupe-400"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setSelected(null)}
        onKeyDown={onKeyDown}
        onFocus={() => setSelected((current) => current ?? (count > 0 ? last : null))}
        onBlur={() => setSelected(null)}
      >
        <svg width={width} height={height} className="block overflow-visible">
          {domain.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={plotLeft}
                x2={plotRight}
                y1={yOf(tick)}
                y2={yOf(tick)}
                stroke={tick === 0 ? AXIS : GRID}
                strokeWidth={1}
              />
              <text
                x={plotLeft - 8}
                y={yOf(tick) + 3.5}
                textAnchor="end"
                className="fill-taupe-600 text-[11px]"
              >
                {compactNumber(tick)}
              </text>
            </g>
          ))}
          {months.map((month, i) => (
            <text
              key={month.month}
              x={xOf(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-taupe-600 text-[11px]"
            >
              {monthShortLabel(month.month)}
            </text>
          ))}
          {selected !== null && (
            <rect
              data-mark="selection"
              x={xOf(selected) - step / 2}
              y={plotTop}
              width={step}
              height={PLOT_HEIGHT}
              fill={GRID}
              opacity={0.5}
            />
          )}
          {months.map((month, i) => (
            <MonthBar
              key={month.month}
              fees={month.feesByCurrencyUsd}
              x={xOf(i) - barWidth / 2}
              width={barWidth}
              yOf={yOf}
            />
          ))}
        </svg>
        {selected !== null && (
          <Tooltip
            day={monthLongLabel(months[selected].month)}
            rows={tooltipRows(selected)}
            x={xOf(selected)}
            flip={xOf(selected) > width * 0.6}
            width={width}
          />
        )}
      </div>
    </figure>
  );
}

/**
 * One month's stack, CELO at the base. Every currency keeps a segment (zero
 * high when it earned nothing) so the stack always has the legend's shape;
 * only the topmost visible segment gets the rounded corners.
 */
function MonthBar({
  fees,
  x,
  width,
  yOf,
}: {
  fees: FeesByCurrencyUsd;
  x: number;
  width: number;
  yOf: (value: number) => number;
}) {
  const bounds = CURRENCY_SERIES.reduce<Array<{ bottom: number; top: number }>>((acc, series) => {
    const bottom = acc.length > 0 ? acc[acc.length - 1].top : 0;
    return [...acc, { bottom, top: bottom + Math.max(0, fees[series.key]) }];
  }, []);
  const topIndex = bounds.reduce((found, b, k) => (b.top > b.bottom ? k : found), -1);

  return (
    <g data-mark="month">
      {CURRENCY_SERIES.map((series, k) => {
        const { bottom, top } = bounds[k];
        // The white gap is carved out of the upper segment's base.
        const base = yOf(bottom) - (k > 0 && top > bottom ? SEGMENT_GAP : 0);
        const y = yOf(top);
        const segmentHeight = Math.max(0, base - y);
        return k === topIndex ? (
          <path
            key={series.key}
            data-mark="segment"
            d={barPath(x, y, base, width)}
            fill={series.color}
          />
        ) : (
          <rect
            key={series.key}
            data-mark="segment"
            x={x}
            y={Math.min(y, base)}
            width={width}
            height={segmentHeight}
            fill={series.color}
          />
        );
      })}
    </g>
  );
}
