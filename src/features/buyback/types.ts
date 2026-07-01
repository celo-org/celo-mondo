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
  others_usd: number | string | null;
  batcher_cost_eth: number | string | null;
  proposer_cost_eth: number | string | null;
  challenger_cost_eth: number | string | null;
  EigenDA_cost_eth: number | string | null;
  eth_price_usd: number | string | null;
}

/** Derived P&L for a single day. */
export interface DailyMetrics {
  day: string;
  celoPriceUsd: number;
  /** Total fee revenue in USD (CELO fees + stablecoin fees). */
  feesCollectedUsd: number;
  /** L1 operating costs (batcher + proposer + challenger + EigenDA), in USD. */
  l1CostUsd: number;
  /** Revenue minus basic (L1) expenses, in USD. */
  feesAfterExpensesUsd: number;
  /** Net profit distributed to buy back & burn CELO, in USD. */
  buybackUsd: number;
  /** Net profit expressed as CELO bought & burned at that day's price. */
  buybackCelo: number;
}

/** Aggregated dashboard figures for a period (all-time or last 24 hrs). */
export interface PeriodStats {
  feesCollectedUsd: number;
  feesAfterExpensesUsd: number;
  celoBoughtAndBurned: number;
  usdSpentOnBuyback: number;
  avgBuybackPriceUsd: number;
}

/** Full dashboard payload returned by the API route. */
export interface BuybackStats {
  totals: PeriodStats;
  last24h: PeriodStats | null;
  latestDay: string | null;
  updatedAt: string;
}
