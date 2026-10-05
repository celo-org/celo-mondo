import { describe, expect, it } from 'vitest';
import fanOutRowsJson from './__fixtures__/duneEigenDaFanOutRows.json';
import duneFeeRowsJson from './__fixtures__/duneFeeRows.json';
import onchain from './__fixtures__/onchainWindow.json';
import expectedJson from './__fixtures__/reportPyExpected.json';
import {
  CARBON_FUND_SHARE_IN_WINDOW,
  SETTLED_REVENUE_CUTOFF_DATE,
  computeBuybackStats,
  computeDailyMetrics,
  mergeSameDayRows,
  parseDay,
} from './computeStats';
import { DuneFeeRow } from './types';

// Real rows of Dune query 6898547 (executed 2026-09-17 16:29 UTC, so its last
// row is a partial day) and the values report.py's compute_row produces for
// them. See __fixtures__/README.md.
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
  duneExecution: { execution_started_at: string; execution_ended_at: string };
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
    expect(rows.some((r) => parseDay(r.day) <= SETTLED_REVENUE_CUTOFF_DATE)).toBe(true);
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
    executionStartedAt: expected.duneExecution.execution_started_at,
    executionEndedAt: expected.duneExecution.execution_ended_at,
    now: new Date('2026-09-18T06:00:00.000Z'),
  };
  const stats = computeBuybackStats(rows, options);

  it('sums exactly the report.py window (day after the cutoff through latest day)', () => {
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

  it("never counts the execution day's partial row, however long ago it ran", () => {
    // The fixture's last row is the day the query ran on, and Dune priced it.
    const last = computeDailyMetrics(rows[rows.length - 1]);
    expect(last.day).toBe('2026-09-17');
    expect(last.celoPriceUsd).toBeGreaterThan(0);

    const weekLater = computeBuybackStats(rows, {
      ...options,
      now: new Date('2026-09-25T00:00:00.000Z'),
    });
    expect(weekLater.latestDay).toBe(WINDOW.to);
    expectClose(weekLater.totals.feesCollectedUsd, stats.totals.feesCollectedUsd);
  });

  it('counts that day once a later execution covers it in full', () => {
    const refreshed = computeBuybackStats(rows, {
      executionStartedAt: '2026-09-18T05:30:00.000Z',
      executionEndedAt: '2026-09-18T05:31:00.000Z',
      now: new Date('2026-09-18T06:00:00.000Z'),
    });
    expect(refreshed.latestDay).toBe('2026-09-17');
    expectClose(
      refreshed.totals.feesCollectedUsd,
      stats.totals.feesCollectedUsd + expected.perDay['2026-09-17'].total_revenue_usd,
    );
  });

  it('passes the Dune execution time through unchanged', () => {
    expect(stats.updatedAt).toBe('2026-09-17T16:29:54.146577Z');
  });
});

describe('the EigenDA fan-out in the real query results', () => {
  // The query returns 2025-09-10 three times: one copy per EigenDA payment.
  const fanOut = fanOutRowsJson as DuneFeeRow[];

  it('is three copies of one day that differ only in the EigenDA payment', () => {
    expect(fanOut).toHaveLength(3);
    expect(new Set(fanOut.map((r) => parseDay(r.day)))).toEqual(new Set(['2025-09-10']));
    expect(new Set(fanOut.map((r) => r.fee_CELO)).size).toBe(1);
    expect(new Set(fanOut.map((r) => r.EigenDA_cost_eth)).size).toBe(3);
  });

  it('merges to the revenue once and the payments summed', () => {
    const merged = mergeSameDayRows('2025-09-10', fanOut);
    expect(merged.fee_CELO).toBe(fanOut[0].fee_CELO);
    expectClose(num(merged.EigenDA_cost_eth), 0.001 + 0.01 + 0.298);
    // Naively summing the copies would triple that day's revenue.
    const naive = sum(fanOut.map((r) => computeDailyMetrics(r).feesCollectedUsd));
    expectClose(naive, 3 * computeDailyMetrics(merged).feesCollectedUsd);
  });

  it('leaves the dashboard untouched, since that day precedes the window', () => {
    const options = {
      executionStartedAt: expected.duneExecution.execution_started_at,
      executionEndedAt: expected.duneExecution.execution_ended_at,
      now: new Date('2026-09-18T06:00:00.000Z'),
    };
    expect(computeBuybackStats([...fanOut, ...rows], options)).toEqual(
      computeBuybackStats(rows, options),
    );
  });
});

describe('on-chain reconciliation of the Dune revenue (archive node, window blocks)', () => {
  // report.py's accrual formula: what reached (or still sits in) the fee sinks
  // during the window, read at the boundary blocks, plus what was withdrawn.
  // Block B is the first block of the day after the window, so both sides cover
  // the same complete UTC days.
  type Stable = 'USDT' | 'USDC' | 'USDm' | 'EURm';
  const a = onchain.balancesAtA;
  const b = onchain.balancesAtB;
  const accruedCelo =
    b.vault_CELO +
    b.fh_CELO -
    (a.vault_CELO + a.fh_CELO) +
    onchain.vaultWithdrawnCelo +
    onchain.feeHandlerToSafe.CELO;
  const accruedStable = (sym: Stable) =>
    b[`fh_${sym}`] - a[`fh_${sym}`] + onchain.feeHandlerToSafe[sym];
  // Tips paid in a fee stablecoin land in the SequencerFeeVault as ERC-20s,
  // which it cannot sweep, so they never reach the Safe.
  const stranded = (sym: Stable) =>
    onchain.vaultStrandedStables[sym].atB - onchain.vaultStrandedStables[sym].atA;
  const gross = (field: keyof DuneFeeRow) => sum(windowRows.map((r) => num(r[field])));

  it('CELO fees in Dune equal on-chain inflow plus the carbon share within 0.01%', () => {
    const grossCelo = gross('fee_CELO');
    const reconciled = accruedCelo + onchain.feeHandlerToCarbon.CELO;
    expect(Math.abs(grossCelo - reconciled) / grossCelo).toBeLessThan(0.0001);
    expect(grossCelo).toBeGreaterThan(4_000_000);
  });

  it('stablecoin fees equal FeeHandler inflow + carbon share + what is stranded in the vault', () => {
    const residual = (sym: Stable) =>
      gross(`fee_${sym}`) - (accruedStable(sym) + onchain.feeHandlerToCarbon[sym] + stranded(sym));
    // 245k USDT reconciles to about 10 USDT; USDm and EURm reconcile exactly.
    expect(Math.abs(residual('USDT')) / gross('fee_USDT')).toBeLessThan(0.0001);
    expect(Math.abs(residual('USDC'))).toBeLessThan(2);
    expect(Math.abs(residual('USDm'))).toBeLessThan(0.01);
    expect(Math.abs(residual('EURm'))).toBeLessThan(0.01);
  });

  it('the stranded stablecoins are a negligible share of the revenue shown', () => {
    const strandedUsd =
      stranded('USDT') + stranded('USDC') + stranded('USDm') + stranded('EURm') * 1.2;
    expect(strandedUsd).toBeGreaterThan(0);
    expect(strandedUsd / expected.windowTotals.total_revenue_usd).toBeLessThan(0.001);
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
    expect(onchain.carbonFractionZeroSince.time.slice(0, 10)).toBe('2026-05-09');
    expect(onchain.carbonFractionZeroSince.block).toBeGreaterThan(64785395);
    expect(onchain.carbonFractionZeroSince.block).toBeLessThan(WINDOW.blockB);
  });

  it('pre-cutoff revenue was returned to the Community Fund before the window starts', () => {
    expect(onchain.revenueReturn.time.slice(0, 10) <= SETTLED_REVENUE_CUTOFF_DATE).toBe(true);
    expect(onchain.revenueReturn.celo).toBeCloseTo(1_748_950, 0);
  });
});
