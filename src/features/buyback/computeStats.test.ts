import { describe, expect, it } from 'vitest';
import {
  CARBON_FUND_SHARE_IN_WINDOW,
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

  it('treats null, empty and non-numeric strings as zero', () => {
    const m = computeDailyMetrics({
      ...dayRow,
      fee_USDT: null,
      fee_USDm: '',
      fee_USDC: 'NaN',
      others_usd: 'n/a',
      EigenDA_cost_eth: 'Infinity',
    } as unknown as DuneFeeRow);
    // Only the CELO fees and the batcher cost survive.
    expect(m.feesCollectedUsd).toBeCloseTo(100, 6);
    expect(m.l1CostUsd).toBeCloseTo(50, 6);
    expect(Number.isFinite(m.communityFundCelo)).toBe(true);
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
    expect(parseDay('2026-06-18')).toBe('2026-06-18');
    expect(parseDay(null)).toBe('');
  });

  it('rejects anything that is not a calendar day', () => {
    expect(parseDay('not-a-date')).toBe('');
    expect(parseDay('2026/06/18')).toBe('');
    expect(parseDay('18-06-2026 00:00')).toBe('');
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

  it('stops both the latest day and the totals at the newest priced day', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01' },
      // Complete but not yet priced by Dune: zero fees, but the L1 cost is there.
      { ...dayRow, day: '2026-05-02', fee_CELO: 0, fee_CELO_usd: 0, fee_USDT: 0 },
    ];
    const stats = computeBuybackStats(rows, options);
    expect(stats.latestDay).toBe('2026-05-01');
    expect(stats.latestDayStats?.feesCollectedUsd).toBeCloseTo(600, 6);
    // The unpriced day's $50 of L1 cost must not drag the totals down.
    expect(stats.totals.feesAfterExpensesUsd).toBeCloseTo(550, 6);
    expect(stats.totals.usdToCommunityFund).toBeCloseTo(467.5, 6);
  });

  it('counts a day as complete only once the next UTC day has started', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01' },
      { ...dayRow, day: '2026-05-02' },
    ];
    const atMidnight = computeBuybackStats(rows, {
      ...options,
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(atMidnight.latestDay).toBe('2026-05-01');
    const justAfter = computeBuybackStats(rows, {
      ...options,
      now: new Date('2026-05-03T00:00:00.000Z'),
    });
    expect(justAfter.latestDay).toBe('2026-05-02');
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

  it('ignores rows without a usable day', () => {
    const stats = computeBuybackStats(
      [
        { ...dayRow, day: '' },
        { ...dayRow, day: 'garbage' },
      ],
      options,
    );
    expect(stats.latestDay).toBeNull();
    expect(stats.latestDayStats).toBeNull();
    expect(stats.totals.feesCollectedUsd).toBe(0);
  });

  it('returns zeros, not a negative carbon deduction, for an empty window', () => {
    const stats = computeBuybackStats([], options);
    expect(stats.totals.celoToCommunityFund).toBe(0);
    expect(stats.totals.usdToCommunityFund).toBe(0);
    expect(stats.totals.avgCeloPriceUsd).toBe(0);
  });
});

describe('Carbon Fund share deduction', () => {
  const options = {
    executionEndedAt: null,
    now: new Date('2026-05-03T12:00:00.000Z'),
  };

  it('is applied once when the payout day is inside the window', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-04-19' },
      { ...dayRow, day: CARBON_FUND_SHARE_IN_WINDOW.day },
      { ...dayRow, day: '2026-04-21' },
    ];
    const stats = computeBuybackStats(rows, options);
    // Three identical days: 3 x 4675 CELO and 3 x 467.5 USD before the deduction.
    expect(stats.totals.celoToCommunityFund).toBeCloseTo(
      3 * 4675 - CARBON_FUND_SHARE_IN_WINDOW.celo,
      4,
    );
    expect(stats.totals.usdToCommunityFund).toBeCloseTo(
      3 * 467.5 - CARBON_FUND_SHARE_IN_WINDOW.usd,
      4,
    );
    // Fees collected and fees after expenses are a different matter.
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(3 * 600, 6);
    expect(stats.totals.feesAfterExpensesUsd).toBeCloseTo(3 * 550, 6);
    // The single-day figure is never reduced.
    expect(stats.latestDayStats?.celoToCommunityFund).toBeCloseTo(4675, 4);
  });

  it('recomputes the average price from the deducted totals', () => {
    const stats = computeBuybackStats(
      Array.from({ length: 10 }, (_, i) => ({
        ...dayRow,
        day: `2026-04-${String(15 + i).padStart(2, '0')}`,
      })),
      options,
    );
    expect(stats.totals.avgCeloPriceUsd).toBeCloseTo(
      stats.totals.usdToCommunityFund / stats.totals.celoToCommunityFund,
      10,
    );
  });

  it('is skipped when the payout day is outside the window', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-04-21' },
      { ...dayRow, day: '2026-04-22' },
    ];
    const stats = computeBuybackStats(rows, options);
    expect(stats.totals.celoToCommunityFund).toBeCloseTo(2 * 4675, 4);
    expect(stats.totals.usdToCommunityFund).toBeCloseTo(2 * 467.5, 6);
  });

  it('reports a loss rather than hiding it when the deduction exceeds the accrual', () => {
    const stats = computeBuybackStats(
      [{ ...dayRow, day: CARBON_FUND_SHARE_IN_WINDOW.day }],
      options,
    );
    expect(stats.totals.celoToCommunityFund).toBeLessThan(0);
    expect(stats.totals.avgCeloPriceUsd).toBe(0);
  });
});
