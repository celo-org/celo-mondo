import { BuybackStats, DailyMetrics, DuneFeeRow, PeriodStats } from 'src/features/buyback/types';

// Constants mirror scripts/sequencer-fees/report.py (celo-monorepo). Proposals
// are named by CGP number: CGP-233 is CELOccelerate (on-chain proposal 286),
// CGP-234 the return of pre-cutoff revenue (proposal 287) and CGP-236 the
// carbon-fund pause (proposal 288).
// Stablecoins are valued at their USD peg; EURm keeps Dune's forex price.
const STABLE_PEGS = { USDT: 1.0, USDC: 1.0, USDm: 1.0 } as const;
// Carbon Fund fraction is 0% after CGP-236 paused those payments. report.py reads
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
 * Sequencer revenue earned on or before this day was already returned to the
 * Community Fund in one transfer of 1,748,950 CELO, documented in CGP-234
 * (on-chain proposal 287). report.py (`CGP_234_CUTOFF_DATE`) clamps its
 * reporting window to the day after it so that revenue is never counted
 * twice; the dashboard does the same for its totals.
 */
export const SETTLED_REVENUE_CUTOFF_DATE = '2026-04-08';

/**
 * Carbon Fund share actually taken inside the dashboard window. The FeeHandler
 * applies the carbon fraction when fees are distributed, not when they accrue,
 * and only one distribution ran before CGP-236 zeroed the fraction (block
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
// A calendar day, alone or followed by a time (Dune appends " 00:00:00.000 UTC").
const DAY_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:$|[ T])/;

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
 * returns an empty string for anything that is not a real UTC calendar day
 * ("2026-99-99", "2026-02-30", "2026-05-01garbage"), since days are compared
 * as strings and a value that only looks like one would land on the wrong
 * side of a boundary.
 */
export function parseDay(day: string | null | undefined): string {
  const match = DAY_PATTERN.exec(day ?? '');
  if (!match) return '';
  const date = new Date(`${match[1]}T00:00:00Z`);
  // The round trip rejects impossible dates the Date parser would roll over.
  return !Number.isNaN(date.getTime()) && toUtcDay(date) === match[1] ? match[1] : '';
}

/** A day's L1 operating costs in ETH: batcher + proposer + challenger + EigenDA. */
function l1CostEth(row: DuneFeeRow): number {
  return (
    num(row.batcher_cost_eth) +
    num(row.proposer_cost_eth) +
    num(row.challenger_cost_eth) +
    num(row.EigenDA_cost_eth)
  );
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
  const ethPriceUsd = num(row.eth_price_usd);
  const l1CostUsd = l1CostEth(row) * ethPriceUsd;
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
  // used to acquire CELO per CGP-233). Burning is a separate governance call.
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
  /**
   * When Dune started executing the query, if known. This is when its snapshot
   * of the chain was taken, so that UTC day is only partly in the results.
   */
  executionStartedAt?: string | null;
  /** When Dune last finished executing the query, if known. */
  executionEndedAt: string | null;
  /** Current time; injectable for tests. Defaults to now. */
  now?: Date;
}

/** UTC calendar day of an ISO timestamp, or null when it is missing or malformed. */
function utcDayOf(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : toUtcDay(date);
}

/**
 * The first UTC day the Dune results do not cover in full. Every row on or
 * after it is dropped.
 *
 * The results are a snapshot taken when the query ran, so the day it ran on is
 * partial for as long as that execution is the latest one, no matter how much
 * time passes afterwards. The request clock is only an upper bound and the
 * fallback when Dune reports no execution time.
 */
export function firstIncompleteDay(options: ComputeBuybackStatsOptions): string {
  const todayUtc = toUtcDay(options.now ?? new Date());
  const snapshotDay = snapshotDayOf(options);
  return snapshotDay !== null && snapshotDay < todayUtc ? snapshotDay : todayUtc;
}

/** The UTC day Dune took its snapshot on, when it reports an execution time. */
function snapshotDayOf(options: ComputeBuybackStatsOptions): string | null {
  return utcDayOf(options.executionStartedAt) ?? utcDayOf(options.executionEndedAt);
}

/** The UTC calendar day before the given one. */
function previousUtcDay(day: string): string {
  return toUtcDay(new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS));
}

/**
 * Refuse a history that does not cover the window day by day.
 *
 * The totals are permanent sums from `sinceDay`, so a result that starts late
 * (a `LIMIT` added to the query), skips a day (an upstream gap) or stops early
 * would be summed as if it were whole while the page still says "since
 * `sinceDay`". Every day from `sinceDay` through `throughDay` must be present.
 * `throughDay` is null when Dune reported no execution time: what the snapshot
 * should reach is then unknown, and only the start and the gaps are checked.
 */
function assertWindowCovered(days: string[], sinceDay: string, throughDay: string | null): void {
  if (days.length === 0) {
    throw new Error(`Dune history has no rows from ${sinceDay} on`);
  }
  let expected = sinceDay;
  for (const day of days) {
    if (day !== expected) {
      throw new Error(`Dune history has no row for ${expected}`);
    }
    expected = nextUtcDay(expected);
  }
  if (throughDay !== null && days[days.length - 1] < throughDay) {
    throw new Error(`Dune history has no row for ${expected}`);
  }
}

// Columns that describe the day itself. Rows for one day must agree on all of
// them; only the EigenDA cost may differ (see mergeSameDayRows).
const DAY_LEVEL_COLUMNS = [
  'fee_CELO',
  'fee_USDT',
  'fee_USDm',
  'fee_EURm',
  'fee_USDC',
  'fee_CELO_usd',
  'fee_EURm_usd',
  'others_usd',
  'batcher_cost_eth',
  'proposer_cost_eth',
  'challenger_cost_eth',
  'eth_price_usd',
] as const satisfies readonly (keyof DuneFeeRow)[];

/**
 * Collapse several rows for one day into one.
 *
 * The Dune query joins one row per EigenDA payment onto the day's revenue, so
 * a day with several payments comes back several times, each copy carrying the
 * full revenue and one payment (2025-09-10 has three). Summing the copies
 * would multiply that day's revenue; the day is its revenue once plus the sum
 * of the EigenDA costs. Rows that disagree on anything else are not that
 * fan-out, and are refused rather than guessed at.
 */
export function mergeSameDayRows(day: string, rows: DuneFeeRow[]): DuneFeeRow {
  const [first, ...rest] = rows;
  const conflicting = rest.some((row) =>
    DAY_LEVEL_COLUMNS.some((column) => num(row[column]) !== num(first[column])),
  );
  if (conflicting) throw new Error(`Dune returned conflicting rows for ${day}`);
  return {
    ...first,
    EigenDA_cost_eth: rows.reduce((total, row) => total + num(row.EigenDA_cost_eth), 0),
  };
}

/**
 * The rows that count: one per UTC day in [sinceDay, cutoffDay). Rows without
 * a usable day are skipped, but a result in which no row has one is refused: a
 * renamed column would otherwise yield a dashboard of zeros. So are a window
 * that is not covered day by day through `throughDay` and a counted day whose
 * L1 costs have no ETH price.
 */
function selectWindowRows(
  rows: DuneFeeRow[],
  sinceDay: string,
  cutoffDay: string,
  throughDay: string | null,
): DuneFeeRow[] {
  const dated = rows
    .map((row) => ({ row, day: parseDay(row.day) }))
    .filter(({ day }) => day !== '');
  if (rows.length > 0 && dated.length === 0) {
    throw new Error('Dune rows carry no usable day');
  }

  const byDay = new Map<string, DuneFeeRow[]>();
  for (const { row, day } of dated) {
    if (day < sinceDay || day >= cutoffDay) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), row]);
  }
  // Before the first day of the window has completed there is nothing to cover.
  if (cutoffDay > sinceDay) {
    assertWindowCovered([...byDay.keys()].sort(), sinceDay, throughDay);
  }
  return [...byDay].map(([day, group]) => {
    const row = group.length === 1 ? group[0] : mergeSameDayRows(day, group);
    // Costs that cannot be valued would drop out of the P&L and overstate the
    // day's profit, so a counted day must come with the price to value them.
    if (l1CostEth(row) > 0 && num(row.eth_price_usd) <= 0) {
      throw new Error(`Dune has L1 costs but no ETH price for ${day}`);
    }
    return row;
  });
}

/**
 * Turn raw Dune rows into the dashboard payload: totals for the CELOccelerate
 * window plus the most recent complete day.
 *
 * The window mirrors report.py's defaults: it starts the day after the
 * settled-revenue cutoff and ends with the last complete UTC day in the Dune
 * results (report.py's `--to yesterday`, taken relative to the execution rather
 * than the request). The bucket of the day the query ran on is still filling,
 * priced or not, and is dropped.
 */
export function computeBuybackStats(
  rows: DuneFeeRow[],
  options: ComputeBuybackStatsOptions,
): BuybackStats {
  const sinceDay = nextUtcDay(SETTLED_REVENUE_CUTOFF_DATE);
  const cutoffDay = firstIncompleteDay(options);
  // With a known snapshot day, the history must reach the day before the cutoff.
  const throughDay = snapshotDayOf(options) !== null ? previousUtcDay(cutoffDay) : null;

  const entries = selectWindowRows(rows, sinceDay, cutoffDay, throughDay)
    .map((row) => ({ row, metrics: computeDailyMetrics(row) }))
    .sort((a, b) => a.metrics.day.localeCompare(b.metrics.day));
  const days = entries.map(({ metrics }) => metrics);

  // A day Dune has not priced yet (prices.day lags by up to a day) shows up
  // with zero fees but still carries its L1 costs, so both the single-day
  // figure and the totals stop at the newest day with a CELO price.
  const priced = days.filter((d) => d.celoPriceUsd > 0);
  const latest = priced.length > 0 ? priced[priced.length - 1] : null;
  const counted = latest ? days.filter((d) => d.day <= latest.day) : [];

  // Trailing unpriced days are cut off above. One in the middle cannot be: its
  // USD figures would count while its CELO figures read zero, so the totals
  // would disagree with each other. Nothing can be converted without the
  // day's CELO price, so such a day is refused unless it is entirely empty.
  const unpriced = entries.find(
    ({ row, metrics }) =>
      latest !== null &&
      metrics.day < latest.day &&
      metrics.celoPriceUsd <= 0 &&
      (num(row.fee_CELO) > 0 || metrics.feesCollectedUsd !== 0 || metrics.l1CostUsd !== 0),
  );
  if (unpriced) {
    throw new Error(`Dune has fees or costs but no CELO price for ${unpriced.metrics.day}`);
  }

  return {
    totals: deductCarbonFundShare(aggregate(counted), counted),
    latestDayStats: latest ? aggregate([latest]) : null,
    sinceDay,
    latestDay: latest?.day ?? null,
    updatedAt: options.executionEndedAt,
  };
}
