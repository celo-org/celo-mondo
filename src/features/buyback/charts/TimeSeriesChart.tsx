'use client';

import clsx from 'clsx';
import { KeyboardEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { dayTicks, niceDomain } from 'src/features/buyback/charts/scales';

export interface TooltipRow {
  value: string;
  label: string;
}

export interface TimeSeriesChartProps {
  title: string;
  /** What is plotted and in which unit; the single series needs no legend. */
  description: string;
  /** UTC days (YYYY-MM-DD), one per value, in order. */
  days: string[];
  values: number[];
  kind: 'area' | 'bars' | 'line';
  color: string;
  /** Magnitudes start at zero; a price keeps its own range. */
  baseline?: 'zero' | 'auto';
  formatTick: (value: number) => string;
  formatValue: (value: number) => string;
  /** Every figure for the day at an index, value first. */
  tooltipRows: (index: number) => TooltipRow[];
}

export const MARGIN = { top: 16, right: 16, bottom: 24, left: 56 };
export const PLOT_HEIGHT = 150;
const DEFAULT_WIDTH = 640;
export const MAX_BAR_WIDTH = 24;
const BAR_GAP = 2;
const BAR_CORNER = 4;
export const SURFACE = '#ffffff';
export const GRID = '#E7E3D4';
export const AXIS = '#C6C2B5';

/** The container's rendered width, so the chart fills it without scaling its text. */
export function useContainerWidth(ref: { current: HTMLElement | null }): number {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const measured = entry?.contentRect.width;
      if (measured && measured > 0) setWidth(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** A column with rounded top corners and a square base, as a path. */
export function barPath(x: number, top: number, base: number, width: number): string {
  const height = base - top;
  const r = Math.min(BAR_CORNER, width / 2, height);
  if (r <= 0) return '';
  return [
    `M${x},${base}`,
    `V${top + r}`,
    `a${r},${r} 0 0 1 ${r},-${r}`,
    `h${width - 2 * r}`,
    `a${r},${r} 0 0 1 ${r},${r}`,
    `V${base}`,
    'Z',
  ].join(' ');
}

export function TimeSeriesChart({
  title,
  description,
  days,
  values,
  kind,
  color,
  baseline = 'zero',
  formatTick,
  formatValue,
  tooltipRows,
}: TimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const [selected, setSelected] = useState<number | null>(null);

  const count = values.length;
  const height = MARGIN.top + PLOT_HEIGHT + MARGIN.bottom;
  const plotLeft = MARGIN.left;
  const plotRight = width - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = MARGIN.top + PLOT_HEIGHT;
  const step = (plotRight - plotLeft) / Math.max(count, 1);
  const domain = niceDomain(values, baseline);
  const xOf = (index: number) => plotLeft + (index + 0.5) * step;
  const yOf = (value: number) =>
    plotBottom - ((value - domain.min) / (domain.max - domain.min)) * PLOT_HEIGHT;
  const indexAt = (px: number) =>
    Math.min(count - 1, Math.max(0, Math.floor((px - plotLeft) / step)));

  const last = count - 1;
  const linePath = values
    .map((value, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(value).toFixed(1)}`)
    .join(' ');
  const areaPath =
    count > 0
      ? `${linePath} L${xOf(last).toFixed(1)},${yOf(domain.min).toFixed(1)} L${xOf(0).toFixed(1)},${yOf(domain.min).toFixed(1)} Z`
      : '';
  const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, step - BAR_GAP));
  const zeroY = yOf(Math.max(domain.min, Math.min(0, domain.max)));

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
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

  // The endpoint label sits above and to the left of the last point, where a
  // line rising into it cannot cross it; it drops below only when there is no
  // room above the plot for it (the top margin is there for it).
  const endpointY = count > 0 ? yOf(values[last]) : 0;
  const endpointLabelY = endpointY - 10 >= 4 ? endpointY - 10 : endpointY + 18;
  const endpointLabelX = count > 0 ? xOf(last) - 6 : 0;

  return (
    <figure className="border border-taupe-300 bg-white p-4">
      <figcaption>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-taupe-600">{description}</div>
      </figcaption>
      <div
        ref={containerRef}
        role="img"
        aria-label={
          count > 0
            ? `${title}, ${days[0]} to ${days[last]}, latest ${formatValue(values[last])}`
            : `${title}, no data`
        }
        tabIndex={0}
        className="relative mt-3 outline-none focus-visible:ring-1 focus-visible:ring-taupe-400"
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
                {formatTick(tick)}
              </text>
            </g>
          ))}
          {dayTicks(days).map((tick) => (
            <text
              key={tick.index}
              x={xOf(tick.index)}
              y={height - 6}
              textAnchor="middle"
              className="fill-taupe-600 text-[11px]"
            >
              {tick.label}
            </text>
          ))}

          {kind === 'bars' &&
            values.map((value, i) => (
              <path
                key={days[i]}
                data-mark="bar"
                d={barPath(xOf(i) - barWidth / 2, Math.min(yOf(value), zeroY), zeroY, barWidth)}
                fill={color}
                opacity={selected === i ? 0.7 : 1}
              />
            ))}
          {kind === 'area' && <path d={areaPath} fill={color} fillOpacity={0.1} />}
          {kind !== 'bars' && (
            <path
              data-mark={kind}
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {kind !== 'bars' && count > 0 && (
            <text
              x={endpointLabelX}
              y={endpointLabelY}
              textAnchor="end"
              className="fill-black text-[11px] font-medium"
            >
              {formatValue(values[last])}
            </text>
          )}

          {selected !== null && (
            <g data-mark="selection">
              <line
                x1={xOf(selected)}
                x2={xOf(selected)}
                y1={plotTop}
                y2={plotBottom}
                stroke={AXIS}
                strokeWidth={1}
              />
              {kind !== 'bars' && (
                <circle
                  cx={xOf(selected)}
                  cy={yOf(values[selected])}
                  r={4}
                  fill={color}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              )}
            </g>
          )}
        </svg>
        {selected !== null && (
          <Tooltip
            day={days[selected]}
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

export function Tooltip({
  day,
  rows,
  x,
  flip,
  width,
}: {
  day: string;
  rows: TooltipRow[];
  x: number;
  flip: boolean;
  width: number;
}) {
  return (
    <div
      role="status"
      className={clsx(
        'pointer-events-none absolute top-0 z-10 w-max border border-taupe-300 bg-white px-3 py-2 text-xs shadow-md',
      )}
      style={flip ? { right: width - x + 10 } : { left: x + 10 }}
    >
      <div className="mb-1 text-taupe-600">{day}</div>
      {rows.map((row) => (
        <div key={row.label}>
          <span className="font-medium text-black">{row.value}</span>{' '}
          <span className="text-taupe-600">{row.label}</span>
        </div>
      ))}
    </div>
  );
}
