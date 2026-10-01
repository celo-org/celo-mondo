import { BuybackStats, DailyMetrics, DuneFeeRow, PeriodStats } from 'src/features/buyback/types';

// Constants mirror scripts/sequencer-fees/report.py (celo-monorepo, CGP-286).
// Stablecoins are valued at their USD peg; EURm keeps Dune's forex price.
const STABLE_PEGS = { USDT: 1.0, USDC: 1.0, USDm: 1.0 } as const;
// Carbon Fund fraction is 0% after CGP-288 paused those payments. report.py reads
// it live from FeeHandler.getCarbonFraction(); the dashboard pins the current
// value so it needs no RPC. If governance changes it, verify with
// `cast call 0xcD437749E43A154C07F3553504c68fBfD56B8778 "getCarbonFraction()(uint256)"`
// and update this constant; the realData test pins the on-chain value at the
// end of its window.
const CARBON_FRACTION = 0.0;
// OP Superchain revenue share: max(2.5% of revenue, 15% of profit-after-L1).
const OP_SHARE_REVENUE_PCT = 0.025;
const OP_SHARE_PROFIT_PCT = 0.15;

/**
 * CGP-287 returned every sequencer fee earned on or before this day to
 * Governance in a single transfer. report.py clamps its reporting window to the
 * day after it so that revenue is never counted twice; the dashboard does the
 * same for its totals.
 */
export const CGP_287_CUTOFF_DATE = '2026-04-08';

/**
 * Carbon Fund share actually taken inside the dashboard window. The FeeHandler
 * applies the carbon fraction when fees are distributed, not when they accrue,
 * and only one distribution ran before CGP-288 zeroed the fraction (block
 * 66408166, 2026-05-09): on 2026-04-20 it sent 12,429.15 CELO, 963.17 USDT,
 * 1.66 USDC, 11.54 USDm and 0.17 EURm to the Carbon Fund
 * (0xCe10d577295d34782815919843a3a4ef70Dc33ce), e.g. CELO tx
 * 0x5b540e987f5a816aeba5a72dab5e6e67d43d14914b4b59a01f9dde2ad9cf4ac5.
 * Valued at that day's prices (CELO $0.08377, stablecoins at peg, EURm at
 * Dune's forex price) the share is 24,086.79 CELO / $2,017.75. The per-day
 * P&L cannot express a distribution-time deduction, so it is subtracted from
 * the window totals as a constant.
 */
export const CARBON_FUND_SHARE_IN_WINDOW = {
  day: '2026-04-20',
  celo: 24086.7871,
  usd: 2017.75,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Format a date as a UTC calendar day (YYYY-MM-DD). */
export function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The UTC calendar day after the given one. */
export function nextUtcDay(day: string): string {
  return toUtcDay(new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS));
}

/**
 * Dune returns the day as a full timestamp ("2026-06-18 00:00:00.000 UTC");
 * only the date part is meaningful. Mirrors report.py's `parse_day`, but
 * returns an empty string for anything that is not a calendar day so such rows
 * are dropped instead of being compared lexicographically.
 */
export function parseDay(day: string | null | undefined): string {
  const date = (day ?? '').slice(0, 10);
  return DAY_PATTERN.test(date) ? date : '';
}

/**
 * Compute the derived P&L for a single day, faithful to report.py's
 * `compute_row`. USD↔CELO conversions use that day's CELO price so aggregates
 * stay accurate across price moves (non-linear because of the `max()` in the OP
 * share).
 */
export function computeDailyMetrics(row: DuneFeeRow): DailyMetrics {
  const feeCelo = num(row.fee_CELO);
  const feeUsdt = num(row.fee_USDT);
  const feeUsdm = num(row.fee_USDm);
  const feeUsdc = num(row.fee_USDC);

  const feeCeloUsd = num(row.fee_CELO_usd);
  const feeEurmUsd = num(row.fee_EURm_usd);
  const othersUsd = num(row.others_usd);

  // Stablecoin USD values come from the hardcoded pegs, not Dune's price feed.
  const feeUsdtUsd = feeUsdt * STABLE_PEGS.USDT;
  const feeUsdcUsd = feeUsdc * STABLE_PEGS.USDC;
  const feeUsdmUsd = feeUsdm * STABLE_PEGS.USDm;

  const celoPriceUsd = feeCelo > 0 ? feeCeloUsd / feeCelo : 0;

  const revenueUsd = feeCeloUsd + feeUsdtUsd + feeUsdmUsd + feeEurmUsd + feeUsdcUsd + othersUsd;
  const revenueCelo = celoPriceUsd > 0 ? revenueUsd / celoPriceUsd : 0;

  // L1 operating costs, converted from ETH at this day's ETH price.
  const l1Eth =
    num(row.batcher_cost_eth) +
    num(row.proposer_cost_eth) +
    num(row.challenger_cost_eth) +
    num(row.EigenDA_cost_eth);
  const ethPriceUsd = num(row.eth_price_usd);
  const l1CostUsd = l1Eth * ethPriceUsd;
  const l1CostCelo = celoPriceUsd > 0 ? l1CostUsd / celoPriceUsd : 0;

  const carbonUsd = revenueUsd * CARBON_FRACTION;
  const carbonCelo = revenueCelo * CARBON_FRACTION;

  // Profit for the OP calc is revenue minus L1 (carbon is not deducted first).
  const opProfitUsd = revenueUsd - l1CostUsd;
  const opProfitCelo = revenueCelo - l1CostCelo;
  const opShareUsd = Math.max(revenueUsd * OP_SHARE_REVENUE_PCT, opProfitUsd * OP_SHARE_PROFIT_PCT);
  const opShareCelo = Math.max(
    revenueCelo * OP_SHARE_REVENUE_PCT,
    opProfitCelo * OP_SHARE_PROFIT_PCT,
  );

  // Net profit goes to the Community Fund (as CELO; the stablecoin portion is
  // used to acquire CELO per CGP-286). Burning is a separate governance call.
  const communityFundUsd = revenueUsd - (carbonUsd + l1CostUsd + opShareUsd);
  const communityFundCelo = revenueCelo - (carbonCelo + l1CostCelo + opShareCelo);

  return {
    day: parseDay(row.day),
    celoPriceUsd,
    feesCollectedUsd: revenueUsd,
    l1CostUsd,
    feesAfterExpensesUsd: revenueUsd - l1CostUsd,
    communityFundUsd,
    communityFundCelo,
  };
}

/** Sum a set of daily metrics into the dashboard's period figures. */
export function aggregate(days: DailyMetrics[]): PeriodStats {
  const feesCollectedUsd = days.reduce((s, d) => s + d.feesCollectedUsd, 0);
  const feesAfterExpensesUsd = days.reduce((s, d) => s + d.feesAfterExpensesUsd, 0);
  const celoToCommunityFund = days.reduce((s, d) => s + d.communityFundCelo, 0);
  const usdToCommunityFund = days.reduce((s, d) => s + d.communityFundUsd, 0);
  // Volume-weighted average CELO price = total USD value / total CELO.
  const avgCeloPriceUsd = celoToCommunityFund > 0 ? usdToCommunityFund / celoToCommunityFund : 0;

  return {
    feesCollectedUsd,
    feesAfterExpensesUsd,
    celoToCommunityFund,
    usdToCommunityFund,
    avgCeloPriceUsd,
  };
}

/**
 * Remove the Carbon Fund's realised share from the Community Fund totals when
 * the day it was paid falls inside the aggregated days. Fees collected and fees
 * after expenses are untouched: carbon is a distribution of net revenue, not an
 * operating cost.
 */
export function deductCarbonFundShare(totals: PeriodStats, days: DailyMetrics[]): PeriodStats {
  if (!days.some((d) => d.day === CARBON_FUND_SHARE_IN_WINDOW.day)) return totals;
  const celoToCommunityFund = totals.celoToCommunityFund - CARBON_FUND_SHARE_IN_WINDOW.celo;
  const usdToCommunityFund = totals.usdToCommunityFund - CARBON_FUND_SHARE_IN_WINDOW.usd;
  return {
    ...totals,
    celoToCommunityFund,
    usdToCommunityFund,
    avgCeloPriceUsd: celoToCommunityFund > 0 ? usdToCommunityFund / celoToCommunityFund : 0,
  };
}

export interface ComputeBuybackStatsOptions {
  /** When Dune last finished executing the query, if known. */
  executionEndedAt: string | null;
  /** Current time; injectable for tests. Defaults to now. */
  now?: Date;
}

/**
 * Turn raw Dune rows into the dashboard payload: totals for the CELOccelerate
 * window plus the most recent complete day.
 *
 * The window mirrors report.py's defaults: it starts the day after the CGP-287
 * cutoff and ends yesterday (UTC). Today's bucket is dropped because it is still
 * filling and Dune's `prices.day` has no entry for it yet, so it would read as
 * zero revenue.
 */
export function computeBuybackStats(
  rows: DuneFeeRow[],
  options: ComputeBuybackStatsOptions,
): BuybackStats {
  const sinceDay = nextUtcDay(CGP_287_CUTOFF_DATE);
  const todayUtc = toUtcDay(options.now ?? new Date());

  const days = rows
    .map(computeDailyMetrics)
    .filter((d) => d.day >= sinceDay && d.day < todayUtc)
    .sort((a, b) => a.day.localeCompare(b.day));

  // A day Dune has not priced yet (prices.day lags by up to a day) shows up
  // with zero fees but still carries its L1 costs, so both the single-day
  // figure and the totals stop at the newest day with a CELO price.
  const priced = days.filter((d) => d.celoPriceUsd > 0);
  const latest = priced.length > 0 ? priced[priced.length - 1] : null;
  const counted = latest ? days.filter((d) => d.day <= latest.day) : [];

  return {
    totals: deductCarbonFundShare(aggregate(counted), counted),
    latestDayStats: latest ? aggregate([latest]) : null,
    sinceDay,
    latestDay: latest?.day ?? null,
    updatedAt: options.executionEndedAt,
  };
}
