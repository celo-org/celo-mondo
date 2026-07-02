import { BuybackStats, DailyMetrics, DuneFeeRow, PeriodStats } from 'src/features/buyback/types';

// Constants mirror scripts/sequencer-fees/report.py (celo-monorepo, CGP-286).
// Stablecoins are valued at their USD peg; EURm keeps Dune's forex price.
const STABLE_PEGS = { USDT: 1.0, USDC: 1.0, USDm: 1.0 } as const;
// Carbon Fund fraction is 0% after CGP-288 paused those payments.
const CARBON_FRACTION = 0.0;
// OP Superchain revenue share: max(2.5% of revenue, 15% of profit-after-L1).
const OP_SHARE_REVENUE_PCT = 0.025;
const OP_SHARE_PROFIT_PCT = 0.15;

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
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
    day: row.day,
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
 * Turn raw Dune rows into the dashboard payload: all-time totals plus the most
 * recent day as the "last 24 hrs" figure.
 */
export function computeBuybackStats(rows: DuneFeeRow[], updatedAt: string): BuybackStats {
  const days = rows
    .map(computeDailyMetrics)
    .filter((d) => Boolean(d.day))
    .sort((a, b) => a.day.localeCompare(b.day));

  const totals = aggregate(days);
  const latest = days.length > 0 ? days[days.length - 1] : null;
  const last24h = latest ? aggregate([latest]) : null;

  return {
    totals,
    last24h,
    latestDay: latest?.day ?? null,
    updatedAt,
  };
}
