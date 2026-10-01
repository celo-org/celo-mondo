import { describe, expect, it } from 'vitest';
import duneFeeRowsJson from './__fixtures__/duneFeeRows.json';
import onchain from './__fixtures__/onchainWindow.json';
import expectedJson from './__fixtures__/reportPyExpected.json';
import {
  CARBON_FUND_SHARE_IN_WINDOW,
  CGP_287_CUTOFF_DATE,
  computeBuybackStats,
  computeDailyMetrics,
  parseDay,
} from './computeStats';
import { DuneFeeRow } from './types';

// Real rows of Dune query 6898547 (execution 2026-09-17) and the values
// report.py's compute_row produces for them. See __fixtures__/README.md.
const rows = duneFeeRowsJson as DuneFeeRow[];
const expected = expectedJson as {
  perDay: Record<
    string,
    {
      celo_price_usd: number;
      total_revenue_usd: number;
      total_revenue_celo: number;
      total_l1_cost_usd: number;
      total_l1_cost_celo: number;
      op_share_usd: number;
      op_share_celo: number;
      profit_usd: number;
      profit_celo: number;
    }
  >;
  windowTotals: {
    from: string;
    to: string;
    days: number;
    total_revenue_usd: number;
    total_l1_cost_usd: number;
    profit_usd: number;
    profit_celo: number;
  };
  duneExecution: { execution_ended_at: string };
};

const WINDOW = onchain.window;
const inWindow = (day: string) => day >= WINDOW.from && day <= WINDOW.to;
const windowRows = rows.filter((r) => inWindow(parseDay(r.day)));
const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);
const num = (v: number | string | null) => Number(v ?? 0);

// Both sides are IEEE doubles computed in the same order, so only rounding
// noise is tolerated.
function expectClose(actual: number, wanted: number, rel = 1e-9) {
  expect(Math.abs(actual - wanted)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(wanted)));
}

describe('fixture integrity', () => {
  it('covers the whole CELOccelerate window plus pre-cutoff and genesis days', () => {
    expect(windowRows).toHaveLength(expected.windowTotals.days);
    expect(windowRows[0].day).toContain(WINDOW.from);
    expect(windowRows[windowRows.length - 1].day).toContain(WINDOW.to);
    expect(rows.some((r) => parseDay(r.day) <= CGP_287_CUTOFF_DATE)).toBe(true);
    expect(rows.some((r) => parseDay(r.day) === '2025-03-26')).toBe(true);
  });

  it('has a CELO and ETH price on every window day', () => {
    for (const r of windowRows) {
      expect(num(r.fee_CELO)).toBeGreaterThan(0);
      expect(num(r.fee_CELO_usd)).toBeGreaterThan(0);
      expect(num(r.eth_price_usd)).toBeGreaterThan(0);
    }
  });

  it('carries the COPm fix: other-currency fees are negligible', () => {
    expect(Math.max(...rows.map((r) => num(r.others_usd)))).toBeLessThan(1);
  });
});

describe('computeDailyMetrics vs report.py compute_row (real rows)', () => {
  it('matches every fixture day', () => {
    for (const row of rows) {
      const m = computeDailyMetrics(row);
      const want = expected.perDay[m.day];
      expect(want, `missing expected values for ${m.day}`).toBeDefined();
      expectClose(m.celoPriceUsd, want.celo_price_usd);
      expectClose(m.feesCollectedUsd, want.total_revenue_usd);
      expectClose(m.l1CostUsd, want.total_l1_cost_usd);
      expectClose(m.feesAfterExpensesUsd, want.total_revenue_usd - want.total_l1_cost_usd);
      expectClose(m.communityFundUsd, want.profit_usd);
      expectClose(m.communityFundCelo, want.profit_celo);
    }
  });

  it('applies the OP share rule to real days exactly as report.py does', () => {
    const methods = new Set<string>();
    for (const row of rows) {
      const m = computeDailyMetrics(row);
      const want = expected.perDay[m.day];
      const floor = m.feesCollectedUsd * 0.025;
      const profitShare = m.feesAfterExpensesUsd * 0.15;
      // Community Fund = revenue - L1 - OP share, with carbon at 0%.
      expectClose(m.communityFundUsd, m.feesAfterExpensesUsd - Math.max(floor, profitShare));
      expectClose(Math.max(floor, profitShare), want.op_share_usd);
      methods.add(profitShare >= floor ? 'profit' : 'revenue');
    }
    // No real day has had L1 costs above five sixths of revenue, so the
    // 2.5%-of-revenue floor never won; computeStats.test.ts covers that branch
    // with a synthetic loss day.
    expect(methods).toEqual(new Set(['profit']));
  });

  it('handles EigenDA cost being null on most days and set on a few', () => {
    const withEigen = rows.filter((r) => num(r.EigenDA_cost_eth) > 0);
    const without = rows.filter((r) => r.EigenDA_cost_eth === null);
    expect(withEigen.length).toBeGreaterThan(0);
    expect(without.length).toBeGreaterThan(0);
    for (const r of [...withEigen.slice(0, 3), ...without.slice(0, 3)]) {
      expectClose(
        computeDailyMetrics(r).l1CostUsd,
        expected.perDay[parseDay(r.day)].total_l1_cost_usd,
      );
    }
  });
});

describe('computeBuybackStats on the real history', () => {
  const options = {
    executionEndedAt: expected.duneExecution.execution_ended_at,
    now: new Date('2026-09-18T06:00:00.000Z'),
  };
  const stats = computeBuybackStats(rows, options);

  it('sums exactly the report.py window (day after CGP-287 cutoff through latest day)', () => {
    expect(stats.sinceDay).toBe(WINDOW.from);
    expect(stats.latestDay).toBe(WINDOW.to);
    expectClose(stats.totals.feesCollectedUsd, expected.windowTotals.total_revenue_usd);
    expectClose(
      stats.totals.feesAfterExpensesUsd,
      expected.windowTotals.total_revenue_usd - expected.windowTotals.total_l1_cost_usd,
    );
  });

  it('reports Community Fund totals net of the realised Carbon Fund share', () => {
    expectClose(
      stats.totals.celoToCommunityFund,
      expected.windowTotals.profit_celo - CARBON_FUND_SHARE_IN_WINDOW.celo,
    );
    expectClose(
      stats.totals.usdToCommunityFund,
      expected.windowTotals.profit_usd - CARBON_FUND_SHARE_IN_WINDOW.usd,
    );
    expectClose(
      stats.totals.avgCeloPriceUsd,
      stats.totals.usdToCommunityFund / stats.totals.celoToCommunityFund,
    );
  });

  it('excludes pre-cutoff days: totals equal the per-day sum over the window only', () => {
    const want = sum(
      Object.entries(expected.perDay)
        .filter(([day]) => inWindow(day))
        .map(([, v]) => v.total_revenue_usd),
    );
    expectClose(stats.totals.feesCollectedUsd, want);
    const withPreCutoff = sum(Object.values(expected.perDay).map((v) => v.total_revenue_usd));
    expect(withPreCutoff).toBeGreaterThan(want);
  });

  it('exposes the latest day as its own un-deducted figures', () => {
    const want = expected.perDay[WINDOW.to];
    expectClose(stats.latestDayStats!.feesCollectedUsd, want.total_revenue_usd);
    expectClose(stats.latestDayStats!.celoToCommunityFund, want.profit_celo);
    expectClose(stats.latestDayStats!.usdToCommunityFund, want.profit_usd);
  });

  it('treats the newest day as partial when run on that same UTC day', () => {
    const sameDay = computeBuybackStats(rows, {
      ...options,
      now: new Date('2026-09-17T23:59:59Z'),
    });
    expect(sameDay.latestDay).toBe('2026-09-16');
    expectClose(
      sameDay.totals.feesCollectedUsd,
      stats.totals.feesCollectedUsd - expected.perDay[WINDOW.to].total_revenue_usd,
    );
  });

  it('passes the Dune execution time through unchanged', () => {
    expect(stats.updatedAt).toBe('2026-09-17T16:29:54.146577Z');
  });
});

describe('on-chain reconciliation of the Dune revenue (archive node, window blocks)', () => {
  // report.py's accrual formula: what reached (or still sits in) the fee sinks
  // during the window, read at the boundary blocks, plus what was withdrawn.
  const a = onchain.balancesAtA;
  const b = onchain.balancesAtB;
  const accruedCelo =
    b.vault_CELO +
    b.fh_CELO -
    (a.vault_CELO + a.fh_CELO) +
    onchain.vaultWithdrawnCelo +
    onchain.feeHandlerToSafe.CELO;
  const accruedStable = (sym: 'USDT' | 'USDC' | 'USDm' | 'EURm') =>
    b[`fh_${sym}`] - a[`fh_${sym}`] + onchain.feeHandlerToSafe[sym];
  const gross = (field: keyof DuneFeeRow) => sum(windowRows.map((r) => num(r[field])));

  it('CELO fees in Dune equal on-chain inflow plus the carbon share within 0.1%', () => {
    const grossCelo = gross('fee_CELO');
    const reconciled = accruedCelo + onchain.feeHandlerToCarbon.CELO;
    expect(Math.abs(grossCelo - reconciled) / grossCelo).toBeLessThan(0.001);
    expect(grossCelo).toBeGreaterThan(4_000_000);
  });

  it('USDT and USDC fees in Dune match on-chain inflow plus the carbon share within 0.1%', () => {
    for (const sym of ['USDT', 'USDC'] as const) {
      const g = gross(`fee_${sym}`);
      const reconciled = accruedStable(sym) + onchain.feeHandlerToCarbon[sym];
      expect(Math.abs(g - reconciled) / g, sym).toBeLessThan(0.001);
    }
  });

  it('USDm and EURm differ only by dust', () => {
    expect(
      Math.abs(gross('fee_USDm') - (accruedStable('USDm') + onchain.feeHandlerToCarbon.USDm)),
    ).toBeLessThan(50);
    expect(
      Math.abs(gross('fee_EURm') - (accruedStable('EURm') + onchain.feeHandlerToCarbon.EURm)),
    ).toBeLessThan(10);
  });

  it('the Carbon Fund share constant is the on-chain transfers valued at that day prices', () => {
    const day = rows.find((r) => parseDay(r.day) === '2026-04-20')!;
    const celoPrice = num(day.fee_CELO_usd) / num(day.fee_CELO);
    const eurmPrice = num(day.fee_EURm_usd) / num(day.fee_EURm);
    const c = onchain.feeHandlerToCarbon;
    const stablesUsd = c.USDT + c.USDC + c.USDm + c.EURm * eurmPrice;
    const usd = c.CELO * celoPrice + stablesUsd;
    const celo = c.CELO + stablesUsd / celoPrice;
    expect(Math.abs(CARBON_FUND_SHARE_IN_WINDOW.usd - usd)).toBeLessThan(0.01);
    expect(Math.abs(CARBON_FUND_SHARE_IN_WINDOW.celo - celo)).toBeLessThan(0.001);
    // Only one distribution ran before the fraction was zeroed, so the share is small.
    expect(CARBON_FUND_SHARE_IN_WINDOW.celo / accruedCelo).toBeLessThan(0.01);
  });

  it('the carbon fraction was zeroed inside the window, after the only carbon payout', () => {
    expect(onchain.carbonFractionZeroSince.cgp288_time.slice(0, 10)).toBe('2026-05-09');
    expect(onchain.carbonFractionZeroSince.cgp288_block).toBeGreaterThan(64785395);
    expect(onchain.carbonFractionZeroSince.cgp288_block).toBeLessThan(WINDOW.blockB);
  });

  it('CGP-287 settled pre-cutoff revenue before the window starts', () => {
    expect(onchain.cgp287Settlement.time.slice(0, 10) <= CGP_287_CUTOFF_DATE).toBe(true);
    expect(onchain.cgp287Settlement.celo).toBeCloseTo(1_748_950, 0);
  });
});
