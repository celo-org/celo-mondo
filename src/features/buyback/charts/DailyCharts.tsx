'use client';

import { compactNumber } from 'src/features/buyback/charts/scales';
import { TimeSeriesChart } from 'src/features/buyback/charts/TimeSeriesChart';
import { cumulativeCeloAccrued } from 'src/features/buyback/computeStats';
import { DailyMetrics } from 'src/features/buyback/types';

// Money flows take the green the headline figures use; the price, which is
// context rather than a flow, takes a blue. Both clear 3:1 on the white card
// and stay apart under every colour-vision deficiency (validated).
const FLOW_COLOR = '#20A144';
const PRICE_COLOR = '#2563eb';

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const price = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const usd = (value: number) => `${whole.format(Math.round(value) || 0)} USD`;
const celo = (value: number) => `${whole.format(Math.round(value) || 0)} CELO`;
const priceUsd = (value: number) => `${price.format(value)} USD`;

/** The day-by-day view of the figures: three charts and the table behind them. */
export function DailyCharts({ days }: { days: DailyMetrics[] }) {
  if (days.length === 0) return null;
  const labels = days.map((d) => d.day);
  const accrued = cumulativeCeloAccrued(days);

  return (
    <div className="space-y-4">
      <TimeSeriesChart
        title="CELO accrued for the Community Fund"
        description="Cumulative since the window opened, net of the Carbon Fund share"
        kind="area"
        color={FLOW_COLOR}
        days={labels}
        values={accrued}
        formatTick={compactNumber}
        formatValue={celo}
        tooltipRows={(i) => [
          { value: celo(accrued[i]), label: 'accrued to date' },
          { value: celo(days[i].communityFundCelo), label: 'that day' },
          { value: usd(days[i].communityFundUsd), label: 'that day, in USD' },
        ]}
      />
      <TimeSeriesChart
        title="Fees collected per day"
        description="USD value of sequencer fees, before L1 costs and the OP Superchain share"
        kind="bars"
        color={FLOW_COLOR}
        days={labels}
        values={days.map((d) => d.feesCollectedUsd)}
        formatTick={compactNumber}
        formatValue={usd}
        tooltipRows={(i) => [
          { value: usd(days[i].feesCollectedUsd), label: 'fees collected' },
          { value: usd(days[i].l1CostUsd), label: 'L1 costs' },
          { value: usd(days[i].feesAfterExpensesUsd), label: 'after basic expenses' },
        ]}
      />
      <TimeSeriesChart
        title="CELO price"
        description="Daily price used to convert that day's USD figures to CELO"
        kind="line"
        baseline="auto"
        color={PRICE_COLOR}
        days={labels}
        values={days.map((d) => d.celoPriceUsd)}
        formatTick={(value) => price.format(value)}
        formatValue={priceUsd}
        tooltipRows={(i) => [{ value: priceUsd(days[i].celoPriceUsd), label: 'CELO price' }]}
      />
      <DailyTable days={days} />
    </div>
  );
}

const COLUMNS: Array<{ label: string; cell: (d: DailyMetrics) => string }> = [
  { label: 'Fees collected (USD)', cell: (d) => whole.format(Math.round(d.feesCollectedUsd)) },
  { label: 'L1 costs (USD)', cell: (d) => whole.format(Math.round(d.l1CostUsd)) },
  {
    label: 'After expenses (USD)',
    cell: (d) => whole.format(Math.round(d.feesAfterExpensesUsd)),
  },
  { label: 'Accrued (CELO)', cell: (d) => whole.format(Math.round(d.communityFundCelo)) },
  { label: 'Accrued (USD)', cell: (d) => whole.format(Math.round(d.communityFundUsd)) },
  { label: 'CELO price (USD)', cell: (d) => price.format(d.celoPriceUsd) },
];

/** Every figure the charts show, readable without hovering; newest day first. */
function DailyTable({ days }: { days: DailyMetrics[] }) {
  const newestFirst = [...days].reverse();
  return (
    <details className="border border-taupe-300 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm">
        Daily figures ({days.length} days)
      </summary>
      <div className="max-h-96 overflow-auto border-t border-taupe-300">
        <table className="w-full text-xs tabular-nums">
          <thead className="sticky top-0 bg-taupe-100 text-left uppercase tracking-wide text-taupe-600">
            <tr>
              <th className="px-4 py-2 font-normal">Day</th>
              {COLUMNS.map((column) => (
                <th key={column.label} className="px-3 py-2 text-right font-normal">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((d) => (
              <tr key={d.day} className="border-t border-taupe-300">
                <td className="px-4 py-1.5">{d.day}</td>
                {COLUMNS.map((column) => (
                  <td key={column.label} className="px-3 py-1.5 text-right">
                    {column.cell(d)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
