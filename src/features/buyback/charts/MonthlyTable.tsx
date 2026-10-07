import { daysInMonth, monthLongLabel } from 'src/features/buyback/charts/scales';
import { formatPrice, formatWhole } from 'src/features/buyback/format';
import { MonthlyStats } from 'src/features/buyback/types';

/** A partial month says how much of it is counted. */
export function monthDays(month: MonthlyStats): string {
  const full = daysInMonth(month.month);
  return month.days < full ? `${month.days} of ${full}` : String(month.days);
}

const COLUMNS: Array<{ label: string; cell: (m: MonthlyStats) => string }> = [
  { label: 'Days', cell: monthDays },
  { label: 'Fees (USD)', cell: (m) => formatWhole(m.stats.feesCollectedUsd) },
  { label: 'L1 costs (USD)', cell: (m) => formatWhole(m.stats.l1CostUsd) },
  { label: 'OP share, est. (USD)', cell: (m) => formatWhole(m.stats.opShareUsd) },
  { label: 'Carbon Fund (USD)', cell: (m) => formatWhole(m.stats.carbonFundUsd) },
  { label: 'Accrued (CELO)', cell: (m) => formatWhole(m.stats.celoToCommunityFund) },
  { label: 'Accrued (USD)', cell: (m) => formatWhole(m.stats.usdToCommunityFund) },
  {
    label: 'Avg price (USD)',
    cell: (m) => (m.stats.avgCeloPriceUsd > 0 ? formatPrice(m.stats.avgCeloPriceUsd) : '—'),
  },
];

/** The period by calendar month, newest first. */
export function MonthlyTable({ months }: { months: MonthlyStats[] }) {
  if (months.length === 0) return null;
  const newestFirst = [...months].reverse();
  return (
    <section className="border border-taupe-300 bg-white" aria-labelledby="buyback-monthly">
      <h2 id="buyback-monthly" className="px-4 py-3 text-sm font-medium">
        Monthly figures
      </h2>
      <div className="overflow-x-auto border-t border-taupe-300">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-taupe-100 text-left uppercase tracking-wide text-taupe-600">
            <tr>
              <th className="px-4 py-2 font-normal">Month</th>
              {COLUMNS.map((column) => (
                <th key={column.label} className="px-3 py-2 text-right font-normal">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((m) => (
              <tr key={m.month} className="border-t border-taupe-300">
                <td className="whitespace-nowrap px-4 py-1.5">{monthLongLabel(m.month)}</td>
                {COLUMNS.map((column) => (
                  <td key={column.label} className="whitespace-nowrap px-3 py-1.5 text-right">
                    {column.cell(m)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
