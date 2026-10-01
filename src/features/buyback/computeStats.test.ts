import { describe, expect, it } from 'vitest';
import {
  CGP_287_CUTOFF_DATE,
  aggregate,
  computeBuybackStats,
  computeDailyMetrics,
  nextUtcDay,
  parseDay,
} from './computeStats';
import { DuneFeeRow } from './types';

// A single day: 1000 CELO fees @ $0.10, 500 USDT fees, and $50 of L1 cost.
// celo_price      = 100 / 1000 = 0.10
// revenue_usd     = 100 (CELO) + 500 (USDT) = 600
// revenue_celo    = 600 / 0.10 = 6000
// l1_usd          = 0.05 ETH * 1000 = 50 ; l1_celo = 50 / 0.10 = 500
// op_profit_celo  = 6000 - 500 = 5500
// op_share_celo   = max(0.025*6000, 0.15*5500) = max(150, 825) = 825
// buyback_celo    = 6000 - 0 - 500 - 825 = 4675
// buyback_usd     = 4675 * 0.10 = 467.5
const dayRow: DuneFeeRow = {
  day: '2026-05-01',
  fee_CELO: 1000,
  fee_USDT: 500,
  fee_USDm: 0,
  fee_EURm: 0,
  fee_USDC: 0,
  fee_CELO_usd: 100,
  fee_EURm_usd: 0,
  others_usd: 0,
  batcher_cost_eth: 0.05,
  proposer_cost_eth: 0,
  challenger_cost_eth: 0,
  EigenDA_cost_eth: 0,
  eth_price_usd: 1000,
};

describe('computeDailyMetrics', () => {
  it('computes P&L faithfully to report.py compute_row', () => {
    const m = computeDailyMetrics(dayRow);
    expect(m.celoPriceUsd).toBeCloseTo(0.1, 10);
    expect(m.feesCollectedUsd).toBeCloseTo(600, 6);
    expect(m.l1CostUsd).toBeCloseTo(50, 6);
    expect(m.feesAfterExpensesUsd).toBeCloseTo(550, 6);
    expect(m.communityFundCelo).toBeCloseTo(4675, 4);
    expect(m.communityFundUsd).toBeCloseTo(467.5, 6);
  });

  it('uses hardcoded $1 pegs for stablecoins, ignoring missing Dune USD columns', () => {
    // fee_CELO_usd omitted from revenue on the CELO side but USDT still pegs to $1.
    const m = computeDailyMetrics({ ...dayRow, fee_USDT: 250, fee_CELO_usd: 100 });
    // revenue = 100 + 250 = 350
    expect(m.feesCollectedUsd).toBeCloseTo(350, 6);
  });

  it('handles a day with no CELO fees without dividing by zero', () => {
    const m = computeDailyMetrics({
      ...dayRow,
      fee_CELO: 0,
      fee_CELO_usd: 0,
      fee_USDT: 100,
    });
    expect(m.celoPriceUsd).toBe(0);
    expect(m.feesCollectedUsd).toBeCloseTo(100, 6);
    // Without a CELO price the CELO-denominated buyback is 0.
    expect(m.communityFundCelo).toBe(0);
  });

  it('keeps losses negative when L1 costs exceed revenue, like report.py', () => {
    // Same day but with 1 ETH of L1 cost = $1000 against $600 revenue.
    const m = computeDailyMetrics({ ...dayRow, batcher_cost_eth: 1 });
    expect(m.feesAfterExpensesUsd).toBeCloseTo(-400, 6);
    expect(m.communityFundUsd).toBeLessThan(0);
    expect(m.communityFundCelo).toBeLessThan(0);
    // OP share falls back to the 2.5%-of-revenue floor on loss days.
    // buyback_usd = 600 - 1000 - max(15, -60) = -415
    expect(m.communityFundUsd).toBeCloseTo(-415, 6);
  });

  it('coerces string values from the Dune JSON payload', () => {
    const m = computeDailyMetrics({
      ...dayRow,
      fee_CELO: '1000',
      fee_CELO_usd: '100',
      fee_USDT: '500',
    } as unknown as DuneFeeRow);
    expect(m.feesCollectedUsd).toBeCloseTo(600, 6);
  });
});

describe('aggregate', () => {
  it('weights the average CELO price by volume', () => {
    const days = [
      { ...computeDailyMetrics(dayRow) },
      // Second day at a higher price: 1000 CELO @ $0.20, no other fees, no costs.
      computeDailyMetrics({
        ...dayRow,
        day: '2026-05-02',
        fee_USDT: 0,
        fee_CELO_usd: 200,
        batcher_cost_eth: 0,
      }),
    ];
    const stats = aggregate(days);
    // avg = total USD spent / total CELO burned
    expect(stats.avgCeloPriceUsd).toBeCloseTo(
      stats.usdToCommunityFund / stats.celoToCommunityFund,
      10,
    );
    expect(stats.celoToCommunityFund).toBeGreaterThan(0);
  });

  it('returns 0 average when nothing was distributed', () => {
    expect(aggregate([]).avgCeloPriceUsd).toBe(0);
  });

  it('sums loss days signed and guards the average against non-positive totals', () => {
    const loss = computeDailyMetrics({ ...dayRow, batcher_cost_eth: 1 });
    const stats = aggregate([loss]);
    expect(stats.usdToCommunityFund).toBeLessThan(0);
    expect(stats.celoToCommunityFund).toBeLessThan(0);
    expect(stats.avgCeloPriceUsd).toBe(0);
  });
});

describe('parseDay', () => {
  it('keeps only the date part of a Dune timestamp', () => {
    expect(parseDay('2026-06-18 00:00:00.000 UTC')).toBe('2026-06-18');
    expect(parseDay(null)).toBe('');
  });
});

describe('nextUtcDay', () => {
  it('rolls over month boundaries in UTC', () => {
    expect(nextUtcDay('2026-04-30')).toBe('2026-05-01');
    expect(nextUtcDay(CGP_287_CUTOFF_DATE)).toBe('2026-04-09');
  });
});

describe('computeBuybackStats', () => {
  // Options for a run on 2026-05-03: yesterday (05-02) is the newest complete day.
  const options = {
    executionEndedAt: '2026-05-03T05:31:00.000Z',
    now: new Date('2026-05-03T12:00:00.000Z'),
  };

  it('sorts by day and exposes the newest complete day separately', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-02', fee_CELO_usd: 200 },
      { ...dayRow, day: '2026-05-01' },
    ];
    const stats = computeBuybackStats(rows, options);
    expect(stats.latestDay).toBe('2026-05-02');
    // latestDayStats equals the aggregate of only the latest day
    const latestOnly = aggregate([computeDailyMetrics(rows[0])]);
    expect(stats.latestDayStats?.feesCollectedUsd).toBeCloseTo(latestOnly.feesCollectedUsd, 6);
    // totals sum both days
    expect(stats.totals.feesCollectedUsd).toBeGreaterThan(stats.latestDayStats!.feesCollectedUsd);
  });

  it('starts the window the day after the CGP-287 cutoff, like report.py', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-04-07' },
      { ...dayRow, day: CGP_287_CUTOFF_DATE },
      { ...dayRow, day: '2026-04-09' },
    ];
    const stats = computeBuybackStats(rows, options);
    expect(stats.sinceDay).toBe('2026-04-09');
    // Only the post-cutoff day counts: 600 USD of fees, not 1800.
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(600, 6);
    expect(stats.latestDay).toBe('2026-04-09');
  });

  it("drops today's partial bucket and only counts complete UTC days", () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-02' },
      // Today's row: still filling, and unpriced because prices.day lags.
      { ...dayRow, day: '2026-05-03', fee_CELO_usd: 0, fee_USDT: 0 },
    ];
    const stats = computeBuybackStats(rows, options);
    expect(stats.latestDay).toBe('2026-05-02');
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(600, 6);
  });

  it('uses the newest priced day as the latest day when the last row has no CELO price', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01' },
      { ...dayRow, day: '2026-05-02', fee_CELO_usd: 0 },
    ];
    const stats = computeBuybackStats(rows, options);
    expect(stats.latestDay).toBe('2026-05-01');
    expect(stats.latestDayStats?.feesCollectedUsd).toBeCloseTo(600, 6);
  });

  it('normalizes Dune day timestamps to calendar days', () => {
    const stats = computeBuybackStats([{ ...dayRow, day: '2026-05-02 00:00:00.000 UTC' }], options);
    expect(stats.latestDay).toBe('2026-05-02');
  });

  it('reports the Dune execution time as updatedAt, or null when unknown', () => {
    expect(computeBuybackStats([dayRow], options).updatedAt).toBe(options.executionEndedAt);
    expect(
      computeBuybackStats([dayRow], { ...options, executionEndedAt: null }).updatedAt,
    ).toBeNull();
  });

  it('ignores rows without a day', () => {
    const stats = computeBuybackStats([{ ...dayRow, day: '' }], options);
    expect(stats.latestDay).toBeNull();
    expect(stats.latestDayStats).toBeNull();
    expect(stats.totals.feesCollectedUsd).toBe(0);
  });
});
