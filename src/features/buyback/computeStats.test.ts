import { describe, expect, it } from 'vitest';
import {
  CARBON_FUND_SHARE_IN_WINDOW,
  SETTLED_REVENUE_CUTOFF_DATE,
  aggregate,
  computeBuybackStats,
  computeDailyMetrics,
  firstIncompleteDay,
  mergeSameDayRows,
  nextUtcDay,
  parseDay,
} from './computeStats';
import { DuneFeeRow } from './types';

type Options = Parameters<typeof computeBuybackStats>[1];

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

// A day on which nothing happened: no fees, no costs, so no CELO price either.
const emptyDay: DuneFeeRow = {
  ...dayRow,
  fee_CELO: 0,
  fee_USDT: 0,
  fee_CELO_usd: 0,
  batcher_cost_eth: 0,
};

/**
 * The given rows plus an empty row for every other day the window has to
 * cover, so a test can state only the days it is about. Real Dune results have
 * a row per day; a history with holes is refused (see the coverage tests).
 */
function history(rows: DuneFeeRow[], options: Options): DuneFeeRow[] {
  const present = new Set(rows.map((r) => parseDay(r.day)));
  const filler: DuneFeeRow[] = [];
  const end = firstIncompleteDay(options);
  for (let day = nextUtcDay(SETTLED_REVENUE_CUTOFF_DATE); day < end; day = nextUtcDay(day)) {
    if (!present.has(day)) filler.push({ ...emptyDay, day });
  }
  return [...rows, ...filler];
}

const statsFor = (rows: DuneFeeRow[], options: Options) =>
  computeBuybackStats(history(rows, options), options);

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
    // avg = total USD value accrued / total CELO accrued
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

  it('accepts a day followed by a time in either common form', () => {
    expect(parseDay('2026-06-18T00:00:00Z')).toBe('2026-06-18');
    expect(parseDay('2028-02-29 00:00:00.000 UTC')).toBe('2028-02-29');
  });

  it('rejects anything that is not a calendar day', () => {
    expect(parseDay('not-a-date')).toBe('');
    expect(parseDay('2026/06/18')).toBe('');
    expect(parseDay('18-06-2026 00:00')).toBe('');
  });

  it.each(['2026-99-99', '2026-13-01', '2026-00-10', '2026-02-30', '2026-02-29', '2026-04-31'])(
    'rejects %s, which is day-shaped but not a real date',
    (value) => {
      expect(parseDay(value)).toBe('');
      expect(parseDay(`${value} 00:00:00.000 UTC`)).toBe('');
    },
  );

  it.each(['2026-05-01garbage', '2026-05-012', '2026-05-01-02', ' 2026-05-01'])(
    'rejects %j, where the day is not cleanly delimited',
    (value) => {
      expect(parseDay(value)).toBe('');
    },
  );
});

describe('nextUtcDay', () => {
  it('rolls over month boundaries in UTC', () => {
    expect(nextUtcDay('2026-04-30')).toBe('2026-05-01');
    expect(nextUtcDay(SETTLED_REVENUE_CUTOFF_DATE)).toBe('2026-04-09');
  });
});

describe('mergeSameDayRows', () => {
  it('keeps the day-level columns once and sums the EigenDA costs', () => {
    const merged = mergeSameDayRows('2026-05-01', [
      { ...dayRow, EigenDA_cost_eth: 0.001 },
      { ...dayRow, EigenDA_cost_eth: '0.01' },
      { ...dayRow, EigenDA_cost_eth: 0.298 },
    ] as unknown as DuneFeeRow[]);
    expect(merged.EigenDA_cost_eth).toBeCloseTo(0.309, 12);
    expect({ ...merged, EigenDA_cost_eth: null }).toEqual({ ...dayRow, EigenDA_cost_eth: null });
  });

  it('treats numbers and their string forms as the same value', () => {
    const merged = mergeSameDayRows('2026-05-01', [
      dayRow,
      { ...dayRow, fee_CELO: '1000', eth_price_usd: '1000' } as unknown as DuneFeeRow,
    ]);
    expect(merged.fee_CELO).toBe(1000);
  });

  it.each(['fee_CELO', 'fee_CELO_usd', 'batcher_cost_eth', 'eth_price_usd'] as const)(
    'refuses copies that differ in %s',
    (column) => {
      expect(() =>
        mergeSameDayRows('2026-05-01', [dayRow, { ...dayRow, [column]: 123.456 }]),
      ).toThrow('conflicting rows for 2026-05-01');
    },
  );
});

describe('firstIncompleteDay', () => {
  const now = new Date('2026-05-05T12:00:00.000Z');

  it('is the day the Dune execution started, however much later the request comes', () => {
    expect(
      firstIncompleteDay({
        executionStartedAt: '2026-05-02T05:30:00.000Z',
        executionEndedAt: '2026-05-02T05:31:00.000Z',
        now,
      }),
    ).toBe('2026-05-02');
  });

  it('uses the start, not the end, when an execution straddles midnight', () => {
    expect(
      firstIncompleteDay({
        executionStartedAt: '2026-05-02T23:59:50.000Z',
        executionEndedAt: '2026-05-03T00:00:10.000Z',
        now,
      }),
    ).toBe('2026-05-02');
  });

  it('parses the microsecond timestamps Dune returns', () => {
    expect(
      firstIncompleteDay({
        executionStartedAt: '2026-05-02T11:56:25.407379Z',
        executionEndedAt: '2026-05-02T11:58:22.014698Z',
        now,
      }),
    ).toBe('2026-05-02');
  });

  it('falls back to the end time when the start is unknown', () => {
    expect(firstIncompleteDay({ executionEndedAt: '2026-05-03T05:31:00.000Z', now })).toBe(
      '2026-05-03',
    );
    expect(
      firstIncompleteDay({
        executionStartedAt: null,
        executionEndedAt: '2026-05-03T05:31:00.000Z',
        now,
      }),
    ).toBe('2026-05-03');
  });

  it('falls back to today when Dune reports no usable execution time', () => {
    expect(firstIncompleteDay({ executionEndedAt: null, now })).toBe('2026-05-05');
    expect(
      firstIncompleteDay({ executionStartedAt: 'soon', executionEndedAt: 'not a date', now }),
    ).toBe('2026-05-05');
  });

  it('never goes past today, even if the execution time is ahead of the clock', () => {
    expect(
      firstIncompleteDay({
        executionStartedAt: '2026-05-06T00:00:01.000Z',
        executionEndedAt: '2026-05-06T00:00:09.000Z',
        now,
      }),
    ).toBe('2026-05-05');
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
    const stats = statsFor(rows, options);
    expect(stats.latestDay).toBe('2026-05-02');
    // latestDayStats equals the aggregate of only the latest day
    const latestOnly = aggregate([computeDailyMetrics(rows[0])]);
    expect(stats.latestDayStats?.feesCollectedUsd).toBeCloseTo(latestOnly.feesCollectedUsd, 6);
    // totals sum both days
    expect(stats.totals.feesCollectedUsd).toBeGreaterThan(stats.latestDayStats!.feesCollectedUsd);
  });

  it('starts the window the day after the settled-revenue cutoff, like report.py', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-04-07' },
      { ...dayRow, day: SETTLED_REVENUE_CUTOFF_DATE },
      { ...dayRow, day: '2026-04-09' },
    ];
    const stats = statsFor(rows, options);
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
    const stats = statsFor(rows, options);
    expect(stats.latestDay).toBe('2026-05-02');
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(600, 6);
  });

  it("never counts the execution day's priced partial row, even after midnight", () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01' },
      // The query ran at 05:30 on 05-02, so this row holds 5.5 hours of fees.
      { ...dayRow, day: '2026-05-02' },
    ];
    const executed = {
      executionStartedAt: '2026-05-02T05:30:00.000Z',
      executionEndedAt: '2026-05-02T05:31:00.000Z',
    };
    for (const now of [
      '2026-05-02T06:00:00.000Z',
      '2026-05-03T00:00:00.000Z',
      '2026-05-09T12:00:00.000Z',
    ]) {
      const stats = statsFor(rows, { ...executed, now: new Date(now) });
      expect(stats.latestDay, now).toBe('2026-05-01');
      expect(stats.totals.feesCollectedUsd, now).toBeCloseTo(600, 6);
    }
  });

  it('counts that day once a later execution covers it in full', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01' },
      { ...dayRow, day: '2026-05-02' },
      { ...dayRow, day: '2026-05-03' },
    ];
    const stats = statsFor(rows, {
      executionStartedAt: '2026-05-03T05:30:00.000Z',
      executionEndedAt: '2026-05-03T05:31:00.000Z',
      now: new Date('2026-05-03T06:00:00.000Z'),
    });
    expect(stats.latestDay).toBe('2026-05-02');
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(1200, 6);
  });

  it('stops both the latest day and the totals at the newest priced day', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01' },
      // Complete but not yet priced by Dune: zero fees, but the L1 cost is there.
      { ...dayRow, day: '2026-05-02', fee_CELO: 0, fee_CELO_usd: 0, fee_USDT: 0 },
    ];
    const stats = statsFor(rows, options);
    expect(stats.latestDay).toBe('2026-05-01');
    expect(stats.latestDayStats?.feesCollectedUsd).toBeCloseTo(600, 6);
    // The unpriced day's $50 of L1 cost must not drag the totals down.
    expect(stats.totals.feesAfterExpensesUsd).toBeCloseTo(550, 6);
    // The window covers the Carbon Fund payout day, so its share comes off.
    expect(stats.totals.usdToCommunityFund).toBeCloseTo(467.5 - CARBON_FUND_SHARE_IN_WINDOW.usd, 6);
  });

  it('refuses an unpriced day in the middle of the window that has fees or costs', () => {
    const priced = { ...dayRow, day: '2026-05-02' };
    const cases: [string, Partial<DuneFeeRow>][] = [
      // Stablecoin fees only: USD revenue with no CELO price to convert it.
      ['stablecoin fees', { fee_CELO: 0, fee_CELO_usd: 0, batcher_cost_eth: 0 }],
      // CELO fees Dune could not price.
      ['unpriced CELO fees', { fee_CELO_usd: 0, fee_USDT: 0, batcher_cost_eth: 0 }],
      // Nothing but L1 costs.
      ['L1 costs', { fee_CELO: 0, fee_CELO_usd: 0, fee_USDT: 0 }],
    ];
    for (const [label, change] of cases) {
      const rows: DuneFeeRow[] = [{ ...dayRow, day: '2026-05-01', ...change }, priced];
      expect(() => statsFor(rows, options), label).toThrow('no CELO price for 2026-05-01');
    }
  });

  it('tolerates up to two trailing unpriced days of activity as price lag', () => {
    const late = {
      executionStartedAt: '2026-05-05T05:30:00.000Z',
      executionEndedAt: '2026-05-05T05:31:00.000Z',
      now: new Date('2026-05-05T12:00:00.000Z'),
    };
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-02' },
      { ...dayRow, day: '2026-05-03', fee_CELO_usd: 0 },
      { ...dayRow, day: '2026-05-04', fee_CELO_usd: 0 },
    ];
    const stats = statsFor(rows, late);
    expect(stats.latestDay).toBe('2026-05-02');
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(600, 6);
  });

  it('refuses a longer unpriced tail with activity', () => {
    const late = {
      executionStartedAt: '2026-05-06T05:30:00.000Z',
      executionEndedAt: '2026-05-06T05:31:00.000Z',
      now: new Date('2026-05-06T12:00:00.000Z'),
    };
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-02' },
      { ...dayRow, day: '2026-05-03', fee_CELO_usd: 0 },
      { ...dayRow, day: '2026-05-04', fee_CELO_usd: 0 },
      { ...dayRow, day: '2026-05-05', fee_CELO_usd: 0 },
    ];
    expect(() => statsFor(rows, late)).toThrow('no CELO price for 3 days through 2026-05-05');
  });

  it('refuses a history with activity but no CELO price on any day', () => {
    // What a query edit that drops the price join would look like.
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01', fee_CELO_usd: 0 },
      { ...dayRow, day: '2026-05-02', fee_CELO_usd: 0 },
    ];
    expect(() => statsFor(rows, options)).toThrow('no CELO price for 2026-05-01');
  });

  it('accepts an entirely empty day in the middle of the window', () => {
    const empty = { fee_CELO: 0, fee_CELO_usd: 0, fee_USDT: 0, batcher_cost_eth: 0 };
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-04-30' },
      { ...dayRow, day: '2026-05-01', ...empty },
      { ...dayRow, day: '2026-05-02' },
    ];
    const stats = statsFor(rows, options);
    expect(stats.latestDay).toBe('2026-05-02');
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(1200, 6);
    expect(stats.totals.celoToCommunityFund).toBeCloseTo(
      2 * 4675 - CARBON_FUND_SHARE_IN_WINDOW.celo,
      4,
    );
  });

  it('counts a day as complete only once the next UTC day has started', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01' },
      { ...dayRow, day: '2026-05-02' },
    ];
    const atMidnight = statsFor(rows, {
      ...options,
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(atMidnight.latestDay).toBe('2026-05-01');
    const justAfter = statsFor(rows, {
      ...options,
      now: new Date('2026-05-03T00:00:00.000Z'),
    });
    expect(justAfter.latestDay).toBe('2026-05-02');
  });

  it('normalizes Dune day timestamps to calendar days', () => {
    const stats = statsFor([{ ...dayRow, day: '2026-05-02 00:00:00.000 UTC' }], options);
    expect(stats.latestDay).toBe('2026-05-02');
  });

  it('reports the Dune execution time as updatedAt, or null when unknown', () => {
    expect(statsFor([dayRow], options).updatedAt).toBe(options.executionEndedAt);
    expect(statsFor([dayRow], { ...options, executionEndedAt: null }).updatedAt).toBeNull();
  });

  it('ignores individual rows without a usable day', () => {
    const stats = statsFor(
      [
        { ...dayRow, day: '' },
        { ...dayRow, day: 'garbage' },
        { ...dayRow, day: '2026-05-01' },
      ],
      options,
    );
    expect(stats.latestDay).toBe('2026-05-01');
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(600, 6);
  });

  it('refuses a result in which no row has a usable day', () => {
    // What a renamed or dropped `day` column looks like.
    const rows = [
      { ...dayRow, day: undefined },
      { ...dayRow, day: null },
    ] as unknown as DuneFeeRow[];
    expect(() => computeBuybackStats(rows, options)).toThrow('no usable day');
  });

  it('counts a day once when the query fans it out per EigenDA payment', () => {
    // Same revenue on each copy, a different EigenDA payment on each.
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01 00:00:00.000 UTC', EigenDA_cost_eth: 0.01 },
      { ...dayRow, day: '2026-05-01 00:00:00.000 UTC', EigenDA_cost_eth: 0.02 },
      { ...dayRow, day: '2026-05-01', EigenDA_cost_eth: null },
    ];
    const stats = statsFor(rows, options);
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(600, 6);
    // L1 = batcher $50 + EigenDA (0.01 + 0.02) ETH x $1000 = $80.
    expect(stats.totals.feesAfterExpensesUsd).toBeCloseTo(520, 6);
    expect(stats.latestDay).toBe('2026-05-01');
  });

  it('refuses same-day rows that disagree on anything but the EigenDA cost', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-01' },
      { ...dayRow, day: '2026-05-01', fee_USDT: 501 },
    ];
    expect(() => statsFor(rows, options)).toThrow('conflicting rows for 2026-05-01');
  });

  it('is not disturbed by duplicated or conflicting days outside the window', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2025-09-10', EigenDA_cost_eth: 0.001 },
      { ...dayRow, day: '2025-09-10', EigenDA_cost_eth: 0.298 },
      { ...dayRow, day: '2025-09-11' },
      { ...dayRow, day: '2025-09-11', fee_USDT: 9 },
      { ...dayRow, day: '2026-05-01' },
    ];
    const stats = statsFor(rows, options);
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(600, 6);
  });

  it('refuses a counted day whose L1 costs have no ETH price', () => {
    for (const eth_price_usd of [null, 0]) {
      expect(() => statsFor([{ ...dayRow, day: '2026-05-01', eth_price_usd }], options)).toThrow(
        'L1 costs but no ETH price for 2026-05-01',
      );
    }
  });

  it('accepts a missing ETH price when there is nothing to value, or outside the window', () => {
    const noCosts = { batcher_cost_eth: null, proposer_cost_eth: 0, EigenDA_cost_eth: null };
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2025-09-10', eth_price_usd: null },
      { ...dayRow, day: '2026-05-01', ...noCosts, eth_price_usd: null },
      // The execution day is dropped before any of this is looked at.
      { ...dayRow, day: '2026-05-03', eth_price_usd: null },
    ];
    const stats = statsFor(rows, options);
    expect(stats.latestDay).toBe('2026-05-01');
    expect(stats.totals.feesAfterExpensesUsd).toBeCloseTo(600, 6);
  });

  it('accepts rows in any order', () => {
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-05-02', fee_CELO_usd: 200 },
      { ...dayRow, day: '2026-04-30' },
      { ...dayRow, day: '2026-05-01' },
    ];
    const stats = statsFor(rows, options);
    expect(stats.latestDay).toBe('2026-05-02');
    expect(stats.totals.feesCollectedUsd).toBeCloseTo(600 + 600 + 700, 6);
  });

  it('returns zeros, not a negative carbon deduction, before the first window day completes', () => {
    const stats = computeBuybackStats([], {
      executionEndedAt: null,
      now: new Date('2026-04-09T12:00:00.000Z'),
    });
    expect(stats.totals.celoToCommunityFund).toBe(0);
    expect(stats.totals.usdToCommunityFund).toBe(0);
    expect(stats.totals.avgCeloPriceUsd).toBe(0);
    expect(stats.latestDay).toBeNull();
  });
});

describe('window coverage', () => {
  const options = {
    executionStartedAt: '2026-05-03T05:30:00.000Z',
    executionEndedAt: '2026-05-03T05:31:00.000Z',
    now: new Date('2026-05-03T12:00:00.000Z'),
  };
  const whole = history([{ ...dayRow, day: '2026-05-01' }], options);
  const without = (day: string) => whole.filter((r) => parseDay(r.day) !== day);

  it('accepts a history with a row for every day of the window', () => {
    expect(whole).toHaveLength(24); // 2026-04-09 through 2026-05-02
    expect(computeBuybackStats(whole, options).latestDay).toBe('2026-05-01');
  });

  it('refuses a history with nothing in the window', () => {
    expect(() => computeBuybackStats([], options)).toThrow('no rows from 2026-04-09 on');
    const old = [{ ...dayRow, day: '2025-09-10' }];
    expect(() => computeBuybackStats(old, options)).toThrow('no rows from 2026-04-09 on');
  });

  it('refuses a history that starts late, as a LIMIT on the query would leave it', () => {
    const suffix = whole.filter((r) => parseDay(r.day) >= '2026-04-25');
    expect(() => computeBuybackStats(suffix, options)).toThrow('no row for 2026-04-09');
  });

  it.each(['2026-04-09', '2026-04-20', '2026-05-01'])('refuses a history missing %s', (day) => {
    expect(() => computeBuybackStats(without(day), options)).toThrow(`no row for ${day}`);
  });

  it('refuses a history that stops before the last complete day of the snapshot', () => {
    expect(() => computeBuybackStats(without('2026-05-02'), options)).toThrow(
      'no row for 2026-05-02',
    );
  });

  it('does not ask for a tail it cannot know when Dune reports no execution time', () => {
    // The clock says 05-10, but nothing says how far this snapshot should reach.
    const stats = computeBuybackStats(whole, {
      executionEndedAt: null,
      now: new Date('2026-05-10T12:00:00.000Z'),
    });
    expect(stats.latestDay).toBe('2026-05-01');
    // Gaps and a late start are still refused.
    expect(() =>
      computeBuybackStats(without('2026-04-20'), {
        executionEndedAt: null,
        now: new Date('2026-05-10T12:00:00.000Z'),
      }),
    ).toThrow('no row for 2026-04-20');
  });

  it('counts a fanned-out day as covered', () => {
    const fanned = [...whole, { ...dayRow, day: '2026-05-01', EigenDA_cost_eth: 0.01 }];
    expect(computeBuybackStats(fanned, options).latestDay).toBe('2026-05-01');
  });

  it('ignores holes before the window', () => {
    const rows = [{ ...dayRow, day: '2025-03-26' }, { ...dayRow, day: '2026-04-01' }, ...whole];
    expect(computeBuybackStats(rows, options).latestDay).toBe('2026-05-01');
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
    const stats = statsFor(rows, options);
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
    const stats = statsFor(
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

  it('is skipped while the window has not reached the payout day', () => {
    const early = { executionEndedAt: null, now: new Date('2026-04-16T12:00:00.000Z') };
    const rows: DuneFeeRow[] = [
      { ...dayRow, day: '2026-04-10' },
      { ...dayRow, day: '2026-04-11' },
    ];
    const stats = statsFor(rows, early);
    expect(stats.totals.celoToCommunityFund).toBeCloseTo(2 * 4675, 4);
    expect(stats.totals.usdToCommunityFund).toBeCloseTo(2 * 467.5, 6);
  });

  it('reports a loss rather than hiding it when the deduction exceeds the accrual', () => {
    const stats = statsFor([{ ...dayRow, day: CARBON_FUND_SHARE_IN_WINDOW.day }], options);
    expect(stats.totals.celoToCommunityFund).toBeLessThan(0);
    expect(stats.totals.avgCeloPriceUsd).toBe(0);
  });
});
