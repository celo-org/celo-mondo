'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { DailyCharts } from 'src/features/buyback/charts/DailyCharts';
import { DailyTable } from 'src/features/buyback/charts/DailyTable';
import { MonthlyStackedChart } from 'src/features/buyback/charts/MonthlyStackedChart';
import { MonthlyTable } from 'src/features/buyback/charts/MonthlyTable';
import { cumulativeCeloAccrued, monthlyStats } from 'src/features/buyback/computeStats';
import { DailyMetrics } from 'src/features/buyback/types';

export type Period = '30' | '90' | 'all';

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Where a period starts: its length in calendar days back from the latest
 * day, counted by date so a gap in the series cannot stretch the period.
 */
export function periodStartIndex(days: DailyMetrics[], period: Period): number {
  if (period === 'all' || days.length === 0) return 0;
  const latest = Date.parse(`${days[days.length - 1].day}T00:00:00Z`);
  const first = new Date(latest - (Number(period) - 1) * DAY_MS).toISOString().slice(0, 10);
  const index = days.findIndex((d) => d.day >= first);
  return index === -1 ? days.length : index;
}

/**
 * Whether the stored days carry the per-day breakdown the views below need.
 * A row stored before those fields existed is served until the next daily
 * refresh replaces it; its totals still show, the breakdown waits a day.
 */
export function hasDailyBreakdown(days: DailyMetrics[]): boolean {
  return days.every(
    (day) => typeof day.opShareUsd === 'number' && typeof day.feesByCurrencyUsd === 'object',
  );
}

/** Everything below the period selector: charts, monthly and daily figures, the CSV. */
export function PeriodFigures({ days: storedDays }: { days: DailyMetrics[] }) {
  const [period, setPeriod] = useState<Period>('all');
  const days = useMemo(() => (hasDailyBreakdown(storedDays) ? storedDays : []), [storedDays]);
  const accruedAll = useMemo(() => cumulativeCeloAccrued(days), [days]);
  const start = periodStartIndex(days, period);
  const periodDays = useMemo(() => days.slice(start), [days, start]);
  const months = useMemo(() => monthlyStats(periodDays), [periodDays]);

  if (days.length === 0) return null;

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Period" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-taupe-600">Charts and tables below</span>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={period === p.value}
            onClick={() => setPeriod(p.value)}
            className={clsx(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              period === p.value
                ? 'border-black bg-black text-white'
                : 'border-taupe-300 bg-white text-black hover:border-taupe-400 hover:bg-black/5',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <DailyCharts days={periodDays} accrued={accruedAll.slice(start)} />
      <MonthlyStackedChart months={months} />
      <MonthlyTable months={months} />
      <DailyTable days={periodDays} />
    </div>
  );
}
