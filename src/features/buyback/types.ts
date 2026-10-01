// Types for the CELO buyback & burn dashboard.
//
// Numbers mirror the per-day P&L computed by the sequencer-fee distribution
// tooling in celo-monorepo (scripts/sequencer-fees, CGP-286 "CELOccelerate").
// The dashboard is driven entirely by the Dune P&L query (id 6898547) — the
// same daily fee/cost dataset the operator report reads.

/** One daily row as returned by the Dune P&L query (id 6898547). */
export interface DuneFeeRow {
  day: string;
  fee_CELO: number | string | null;
  fee_USDT: number | string | null;
  fee_USDm: number | string | null;
  fee_EURm: number | string | null;
  fee_USDC: number | string | null;
  fee_CELO_usd: number | string | null;
  fee_EURm_usd: number | string | null;
  /**
   * USD value of fees paid in any other fee currency. The query excludes COPm
   * here because Dune's price feed for it is off by about three orders of
   * magnitude, which used to inflate this column by thousands of dollars.
   */
  others_usd: number | string | null;
  batcher_cost_eth: number | string | null;
  proposer_cost_eth: number | string | null;
  challenger_cost_eth: number | string | null;
  EigenDA_cost_eth: number | string | null;
  eth_price_usd: number | string | null;
}

/** Derived P&L for a single day. */
export interface DailyMetrics {
  /** UTC calendar day (YYYY-MM-DD). */
  day: string;
  celoPriceUsd: number;
  /** Total fee revenue in USD (CELO fees + stablecoin fees). */
  feesCollectedUsd: number;
  /** L1 operating costs (batcher + proposer + challenger + EigenDA), in USD. */
  l1CostUsd: number;
  /** Revenue minus basic (L1) expenses, in USD. */
  feesAfterExpensesUsd: number;
  /**
   * Net profit destined for the Community Fund, in USD. Per CGP-286 the
   * stablecoin portion is used to acquire CELO; burning is a separate
   * governance decision, not part of the distribution.
   */
  communityFundUsd: number;
  /** Net profit expressed as CELO at that day's price. */
  communityFundCelo: number;
}

/** Aggregated dashboard figures for a period (the whole window or a single day). */
export interface PeriodStats {
  feesCollectedUsd: number;
  feesAfterExpensesUsd: number;
  celoToCommunityFund: number;
  usdToCommunityFund: number;
  avgCeloPriceUsd: number;
}

/** Full dashboard payload returned by the API route. */
export interface BuybackStats {
  /** Totals for every complete day from `sinceDay` through `latestDay`. */
  totals: PeriodStats;
  /** Figures for `latestDay` alone, or null when no priced day is available. */
  latestDayStats: PeriodStats | null;
  /** First day counted: the day after the CGP-287 cutoff (YYYY-MM-DD). */
  sinceDay: string;
  /** Most recent complete day with price data (YYYY-MM-DD), if any. */
  latestDay: string | null;
  /** When Dune last finished executing the query (ISO timestamp), if known. */
  updatedAt: string | null;
}
