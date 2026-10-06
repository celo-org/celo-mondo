// @vitest-environment node
import duneFeeRows from 'src/features/buyback/__fixtures__/duneFeeRows.json';
import reportPyExpected from 'src/features/buyback/__fixtures__/reportPyExpected.json';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { DuneFeeRow } from 'src/features/buyback/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real unstable_cache needs Next's request store; a pass-through keeps the
// handler testable while still recording how the cache is configured.
const unstableCache = vi.hoisted(() => vi.fn(<T>(fn: T): T => fn));
vi.mock('next/cache', () => ({ unstable_cache: unstableCache }));

const mockFetchDuneFeeRows = vi.fn();
const mockFetchLatestExecution = vi.fn();
vi.mock('src/features/buyback/fetchDuneResults', () => ({
  fetchDuneFeeRows: (...args: unknown[]) => mockFetchDuneFeeRows(...args),
  fetchLatestExecution: (...args: unknown[]) => mockFetchLatestExecution(...args),
}));

vi.mock('src/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const rows = duneFeeRows as DuneFeeRow[];
const executionStartedAt = '2026-09-17T16:29:45.379407Z';
const executionEndedAt = '2026-09-17T16:29:54.146577Z';

const execution = { executionId: '01EXEC', executionStartedAt, executionEndedAt };

beforeEach(() => {
  mockFetchDuneFeeRows.mockReset();
  mockFetchLatestExecution.mockReset();
  mockFetchLatestExecution.mockResolvedValue(execution);
  vi.stubEnv('DUNE_API_KEY', 'test-key');
  vi.useFakeTimers({ now: new Date('2026-09-18T06:00:00.000Z'), toFake: ['Date'] });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function get() {
  const { GET } = await import('./route');
  return GET();
}

describe('GET /api/buyback', () => {
  it('caches each history for a week and the served stats, probed every 15 minutes', async () => {
    const route = await import('./route');
    expect(route.dynamic).toBe('force-dynamic');
    expect(unstableCache).toHaveBeenCalledTimes(2);
    const configs = (
      unstableCache.mock.calls as unknown as [unknown, string[], { revalidate: number }][]
    ).map(([, keyParts, options]) => [keyParts, options]);
    expect(configs).toEqual([
      [['buyback-stats'], { revalidate: 7 * 24 * 60 * 60 }],
      [['buyback-served-stats'], { revalidate: 15 * 60 }],
    ]);
  });

  it.each(['', '   ', '\n'])('returns 503 when the Dune key is %j', async (key) => {
    vi.stubEnv('DUNE_API_KEY', key);
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('DUNE_API_KEY');
    expect(mockFetchLatestExecution).not.toHaveBeenCalled();
    expect(mockFetchDuneFeeRows).not.toHaveBeenCalled();
  });

  it('strips stray whitespace from the key before using it', async () => {
    vi.stubEnv('DUNE_API_KEY', ' test-key\n');
    mockFetchDuneFeeRows.mockResolvedValueOnce({ rows, executionStartedAt, executionEndedAt });
    expect((await get()).status).toBe(200);
    expect(mockFetchLatestExecution).toHaveBeenCalledWith('test-key');
    expect(mockFetchDuneFeeRows).toHaveBeenCalledWith('test-key', undefined, '01EXEC');
  });

  it('serves the stats computed from the Dune rows, stamped with the execution time', async () => {
    mockFetchDuneFeeRows.mockResolvedValueOnce({ rows, executionStartedAt, executionEndedAt });

    const response = await get();

    expect(response.status).toBe(200);
    // The key is read from the environment, never passed through the cache key,
    // and the history is read from the execution the probe found.
    expect(mockFetchLatestExecution).toHaveBeenCalledWith('test-key');
    expect(mockFetchDuneFeeRows).toHaveBeenCalledWith('test-key', undefined, '01EXEC');
    expect(mockFetchDuneFeeRows).toHaveBeenCalledTimes(1);
    const body = await response.json();
    const want = computeBuybackStats(rows, {
      executionStartedAt,
      executionEndedAt,
      now: new Date(),
    });
    expect(body).toEqual(JSON.parse(JSON.stringify(want)));
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

  it('returns a generic 500 when Dune cannot be read, keeping the detail out of the body', async () => {
    mockFetchDuneFeeRows.mockRejectedValueOnce(new Error('Dune API 402: Payment Required'));
    const response = await get();
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toBe('Unable to load buyback stats');
    expect(body).not.toContain('402');
  });

  it('returns a generic 500 when the probe itself fails', async () => {
    mockFetchLatestExecution.mockRejectedValueOnce(new Error('Dune API 402: Payment Required'));
    const response = await get();
    expect(response.status).toBe(500);
    expect(mockFetchDuneFeeRows).not.toHaveBeenCalled();
  });
});
