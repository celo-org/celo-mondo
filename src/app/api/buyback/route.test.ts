// @vitest-environment node
import { sql } from 'drizzle-orm';
import { buybackStatsTable } from 'src/db/schema';
import duneFeeRows from 'src/features/buyback/__fixtures__/duneFeeRows.json';
import reportPyExpected from 'src/features/buyback/__fixtures__/reportPyExpected.json';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { BuybackStats, DuneFeeRow } from 'src/features/buyback/types';
import testDatabase from 'src/test/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const rows = duneFeeRows as DuneFeeRow[];
const executionStartedAt = '2026-09-17T16:29:45.379407Z';
const executionEndedAt = '2026-09-17T16:29:54.146577Z';
const stats = computeBuybackStats(rows, {
  executionStartedAt,
  executionEndedAt,
  now: new Date('2026-09-18T06:00:00.000Z'),
});

function store(
  executionId: string,
  startedAt: string,
  figures: BuybackStats,
  executedAt = figures.updatedAt,
) {
  return testDatabase
    .insert(buybackStatsTable)
    .values({ executionId, startedAt, executedAt, stats: figures });
}

async function get() {
  const { GET } = await import('./route');
  return GET();
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/buyback', () => {
  it('never prerenders', async () => {
    const route = await import('./route');
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('answers 503 before the first refresh has stored any figures', async () => {
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Buyback stats not available yet');
  });

  it('serves the stored figures of the newest execution, uncached', async () => {
    await store('01EXEC', executionStartedAt, stats);

    const response = await get();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body).toEqual(JSON.parse(JSON.stringify(stats)));
    expect(body.updatedAt).toBe(executionEndedAt);
    expect(body.sinceDay).toBe('2026-04-09');
    // The query ran on 2026-09-17, so that day's row is partial and left out.
    expect(body.latestDay).toBe('2026-09-16');
    // Independent of computeBuybackStats: report.py's own sums for those days.
    const { total_revenue_usd, total_l1_cost_usd } = reportPyExpected.windowTotals;
    expect(body.totals.feesCollectedUsd).toBeCloseTo(total_revenue_usd, 6);
    expect(body.totals.feesAfterExpensesUsd).toBeCloseTo(total_revenue_usd - total_l1_cost_usd, 6);
    expect(body.totals.celoToCommunityFund).toBeGreaterThan(0);
  });

  it('picks the execution Dune started last, not the one stored or finished last', async () => {
    // Two overlapping executions: the one started later took its snapshot
    // later, even though the earlier one finished after it.
    const newer = { ...stats, updatedAt: '2026-09-18T05:31:20.000000Z', latestDay: '2026-09-17' };
    await store('01NEWER', '2026-09-18T05:31:00.000000Z', newer);
    await store('01OLDER', '2026-09-18T05:30:00.000000Z', stats, '2026-09-18T05:45:00.000000Z');

    const body = await (await get()).json();
    expect(body.updatedAt).toBe(newer.updatedAt);
    expect(body.latestDay).toBe('2026-09-17');
  });

  it('answers a generic 500 when the figures cannot be read', async () => {
    await testDatabase.execute(sql`drop table buyback_stats`);
    const response = await get();
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Unable to load buyback stats');
  });
});
