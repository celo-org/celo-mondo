import { describe, expect, it } from 'vitest';
import { aggregate, computeBuybackStats, computeDailyMetrics } from './computeStats';
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
    expect(m.buybackCelo).toBeCloseTo(4675, 4);
    expect(m.buybackUsd).toBeCloseTo(467.5, 6);
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
    expect(m.buybackCelo).toBe(0);
  });

  it('keeps losses negative when L1 costs exceed revenue, like report.py', () => {
    // Same day but with 1 ETH of L1 cost = $1000 against $600 revenue.
    const m = computeDailyMetrics({ ...dayRow, batcher_cost_eth: 1 });
    expect(m.feesAfterExpensesUsd).toBeCloseTo(-400, 6);
    expect(m.buybackUsd).toBeLessThan(0);
    expect(m.buybackCelo).toBeLessThan(0);
    // OP share falls back to the 2.5%-of-revenue floor on loss days.
    // buyback_usd = 600 - 1000 - max(15, -60) = -415
    expect(m.buybackUsd).toBeCloseTo(-415, 6);
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
  it('weights the average buyback price by CELO volume', () => {
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
    expect(stats.avgBuybackPriceUsd).toBeCloseTo(
      stats.usdSpentOnBuyback / stats.celoBoughtAndBurned,
      10,
    );
    expect(stats.celoBoughtAndBurned).toBeGreaterThan(0);
  });

  it('returns 0 average when nothing was burned', () => {
    expect(aggregate([]).avgBuybackPriceUsd).toBe(0);
  });

  it('sums loss days signed and guards the average against non-positive burn', () => {
    const loss = computeDailyMetrics({ ...dayRow, batcher_cost_eth: 1 });
    const stats = aggregate([loss]);
    expect(stats.usdSpentOnBuyback).toBeLessThan(0);
    expect(stats.celoBoughtAndBurned).toBeLessThan(0);
    expect(stats.avgBuybackPriceUsd).toBe(0);
  });
});

describe('computeBuybackStats', () => {
  it('sorts by day and exposes the latest day as last 24 hrs', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-02', fee_CELO_usd: 200 },
      { ...dayRow, day: '2026-05-01' },
    ];
    const stats = computeBuybackStats(rows, '2026-05-03T00:00:00.000Z');
    expect(stats.latestDay).toBe('2026-05-02');
    // last24h equals the aggregate of only the latest day
    const latestOnly = aggregate([computeDailyMetrics(rows[0])]);
    expect(stats.last24h?.feesCollectedUsd).toBeCloseTo(latestOnly.feesCollectedUsd, 6);
    // totals sum both days
    expect(stats.totals.feesCollectedUsd).toBeGreaterThan(stats.last24h!.feesCollectedUsd);
  });

  it('ignores rows without a day', () => {
    const stats = computeBuybackStats([{ ...dayRow, day: '' }], 'now');
    expect(stats.latestDay).toBeNull();
    expect(stats.last24h).toBeNull();
    expect(stats.totals.feesCollectedUsd).toBe(0);
  });
});
