// @vitest-environment node
import duneFeeRows from 'src/features/buyback/__fixtures__/duneFeeRows.json';
import reportPyExpected from 'src/features/buyback/__fixtures__/reportPyExpected.json';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { DuneFeeRow } from 'src/features/buyback/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real unstable_cache needs Next's request store. This stand-in records
// how each cache is configured and behaves like the Data Cache for the cases
// the route relies on: an entry is computed once per key and arguments and
// then hit, a thrown computation stores nothing, and revalidateTag drops the
// entries carrying that tag.
const { unstableCache, revalidateTag, cacheStore } = vi.hoisted(() => {
  const cacheStore = new Map<string, { value: unknown; tags: string[] }>();
  const unstableCache = vi.fn(
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      keyParts: string[],
      options?: { tags?: string[] },
    ) =>
      async (...args: A): Promise<R> => {
        const key = `${keyParts.join('/')}:${JSON.stringify(args)}`;
        const hit = cacheStore.get(key);
        if (hit) return hit.value as R;
        const value = await fn(...args);
        cacheStore.set(key, { value, tags: options?.tags ?? [] });
        return value;
      },
  );
  const revalidateTag = vi.fn((tag: string) => {
    for (const [key, entry] of cacheStore) if (entry.tags.includes(tag)) cacheStore.delete(key);
  });
  return { unstableCache, revalidateTag, cacheStore };
});
vi.mock('next/cache', () => ({ unstable_cache: unstableCache, revalidateTag }));

const mockFetchDuneFeeRows = vi.fn();
const mockFetchLatestExecution = vi.fn();
vi.mock('src/features/buyback/fetchDuneResults', async (importActual) => ({
  ...(await importActual<typeof import('src/features/buyback/fetchDuneResults')>()),
  fetchDuneFeeRows: (...args: unknown[]) => mockFetchDuneFeeRows(...args),
  fetchLatestExecution: (...args: unknown[]) => mockFetchLatestExecution(...args),
}));

vi.mock('src/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const rows = duneFeeRows as DuneFeeRow[];
const executionStartedAt = '2026-09-17T16:29:45.379407Z';
const executionEndedAt = '2026-09-17T16:29:54.146577Z';

const execution = {
  executionId: '01EXEC',
  state: 'QUERY_STATE_COMPLETED',
  executionStartedAt,
  executionEndedAt,
};

beforeEach(() => {
  cacheStore.clear();
  revalidateTag.mockClear();
  mockFetchDuneFeeRows.mockReset();
  mockFetchLatestExecution.mockReset();
  mockFetchLatestExecution.mockResolvedValue(execution);
  vi.stubEnv('DUNE_API_KEY', 'test-key');
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'deadbeef');
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
  it('keys every cache on the deployment: histories a week, verdicts an hour, attempts and fresh stats per bucket, last good without expiry', async () => {
    const route = await import('./route');
    expect(route.dynamic).toBe('force-dynamic');
    expect(unstableCache).toHaveBeenCalledTimes(6);
    const configs = (
      unstableCache.mock.calls as unknown as [unknown, string[], Record<string, unknown>][]
    ).map(([, keyParts, options]) => [keyParts, options]);
    expect(configs).toEqual([
      [['buyback-stats', 'deadbeef'], { revalidate: 7 * 24 * 60 * 60 }],
      [['buyback-history-verdict', 'deadbeef'], { revalidate: 60 * 60 }],
      [['buyback-history-attempt', 'deadbeef'], { revalidate: 5 * 60 }],
      [['buyback-probe-attempt', 'deadbeef'], { revalidate: 5 * 60 }],
      [['buyback-fresh-stats', 'deadbeef'], { revalidate: 15 * 60 }],
      [
        ['buyback-last-good', 'deadbeef'],
        { revalidate: false, tags: ['buyback-last-good-deadbeef'] },
      ],
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

  it('returns a generic 500 when the probe itself fails and nothing good was loaded before', async () => {
    mockFetchLatestExecution.mockRejectedValue(new Error('Dune API 402: Payment Required'));
    const response = await get();
    expect(response.status).toBe(500);
    expect(mockFetchDuneFeeRows).not.toHaveBeenCalled();
  });

  it('serves the last good figures when a later refresh fails, and refreshes them by tag when they change', async () => {
    mockFetchDuneFeeRows.mockResolvedValueOnce({ rows, executionStartedAt, executionEndedAt });
    const first = await (await get()).json();
    expect(revalidateTag).not.toHaveBeenCalled();

    // A quarter of an hour on, Dune is away: the refresh fails, the figures stay up.
    vi.setSystemTime(new Date('2026-09-18T06:16:00.000Z'));
    mockFetchLatestExecution.mockRejectedValueOnce(new Error('Dune API 503: down'));
    const during = await get();
    expect(during.status).toBe(200);
    expect(await during.json()).toEqual(first);

    // Another quarter on, a new execution: served at once, and the last-good
    // entry is told to follow it.
    vi.setSystemTime(new Date('2026-09-18T06:32:00.000Z'));
    const newer = {
      ...execution,
      executionId: '01NEWER',
      executionEndedAt: '2026-09-18T05:31:00.000Z',
    };
    mockFetchLatestExecution.mockResolvedValueOnce(newer);
    mockFetchDuneFeeRows.mockResolvedValueOnce({
      rows,
      executionStartedAt: '2026-09-18T05:30:00.000Z',
      executionEndedAt: newer.executionEndedAt,
    });
    const after = await (await get()).json();
    expect(after.updatedAt).toBe(newer.executionEndedAt);
    expect(revalidateTag).toHaveBeenCalledWith('buyback-last-good-deadbeef');
  });

  it('returns a generic 500 on a transient Dune failure as well', async () => {
    const { DuneRequestError } = await import('src/features/buyback/fetchDuneResults');
    mockFetchDuneFeeRows.mockRejectedValueOnce(new DuneRequestError('Dune API 503: down', 503));
    const response = await get();
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Unable to load buyback stats');
  });
});
