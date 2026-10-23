import { DailyMetrics } from 'src/features/buyback/types';

const CSV_COLUMNS: Array<{ header: string; value: (d: DailyMetrics) => string | number }> = [
  { header: 'day', value: (d) => d.day },
  { header: 'celo_price_usd', value: (d) => d.celoPriceUsd },
  { header: 'fees_collected_usd', value: (d) => d.feesCollectedUsd },
  { header: 'fees_celo_usd', value: (d) => d.feesByCurrencyUsd.CELO },
  { header: 'fees_usdt_usd', value: (d) => d.feesByCurrencyUsd.USDT },
  { header: 'fees_usdc_usd', value: (d) => d.feesByCurrencyUsd.USDC },
  { header: 'fees_usdm_usd', value: (d) => d.feesByCurrencyUsd.USDm },
  { header: 'fees_eurm_usd', value: (d) => d.feesByCurrencyUsd.EURm },
  { header: 'fees_other_usd', value: (d) => d.feesByCurrencyUsd.other },
  { header: 'l1_cost_usd', value: (d) => d.l1CostUsd },
  { header: 'fees_after_expenses_usd', value: (d) => d.feesAfterExpensesUsd },
  { header: 'op_share_estimate_usd', value: (d) => d.opShareUsd },
  { header: 'community_fund_usd', value: (d) => d.communityFundUsd },
  { header: 'community_fund_celo', value: (d) => d.communityFundCelo },
];

/** The days as CSV, oldest first, figures as stored (unrounded). */
export function dailyCsv(days: DailyMetrics[]): string {
  const header = CSV_COLUMNS.map((c) => c.header).join(',');
  const rows = days.map((d) => CSV_COLUMNS.map((c) => String(c.value(d))).join(','));
  return [header, ...rows].join('\n') + '\n';
}

export function dailyCsvFilename(days: DailyMetrics[]): string {
  const from = days[0]?.day ?? 'none';
  const to = days[days.length - 1]?.day ?? 'none';
  return `celo-buyback-daily-${from}-${to}.csv`;
}

/** Hand the CSV to the browser as a file download. */
export function downloadDailyCsv(days: DailyMetrics[]): void {
  const url = URL.createObjectURL(new Blob([dailyCsv(days)], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = dailyCsvFilename(days);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers start the download after the click returns; revoking
  // the URL at once would cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
