'use client';

import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { downloadDailyCsv } from 'src/features/buyback/charts/dailyCsv';
import { formatPrice, formatWhole } from 'src/features/buyback/format';
import { DailyMetrics } from 'src/features/buyback/types';

const COLUMNS: Array<{ label: string; cell: (d: DailyMetrics) => string }> = [
  { label: 'Fees collected (USD)', cell: (d) => formatWhole(d.feesCollectedUsd) },
  { label: 'L1 costs (USD)', cell: (d) => formatWhole(d.l1CostUsd) },
  { label: 'After expenses (USD)', cell: (d) => formatWhole(d.feesAfterExpensesUsd) },
  { label: 'OP share, est. (USD)', cell: (d) => formatWhole(d.opShareUsd) },
  { label: 'Accrued (CELO)', cell: (d) => formatWhole(d.communityFundCelo) },
  { label: 'Accrued (USD)', cell: (d) => formatWhole(d.communityFundUsd) },
  { label: 'CELO price (USD)', cell: (d) => formatPrice(d.celoPriceUsd) },
];

/** Every figure the charts show, readable without hovering; newest day first. */
export function DailyTable({ days }: { days: DailyMetrics[] }) {
  if (days.length === 0) return null;
  const newestFirst = [...days].reverse();
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <OutlineButton type="button" className="text-sm" onClick={() => downloadDailyCsv(days)}>
          Download CSV
        </OutlineButton>
      </div>
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
                  <td className="whitespace-nowrap px-4 py-1.5">{d.day}</td>
                  {COLUMNS.map((column) => (
                    <td key={column.label} className="whitespace-nowrap px-3 py-1.5 text-right">
                      {column.cell(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
