// @vitest-environment node
import duneFeeRows from 'src/features/buyback/__fixtures__/duneFeeRows.json';
import reportPyExpected from 'src/features/buyback/__fixtures__/reportPyExpected.json';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { DuneFeeRow } from 'src/features/buyback/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real unstable_cache needs Next's request store. This stand-in records
// how the cache is configured and behaves like the Data Cache for the cases
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
const history = { rows, executionStartedAt, executionEndedAt };

beforeEach(() => {
  cacheStore.clear();
  revalidateTag.mockClear();
  mockFetchDuneFeeRows.mockReset();
  mockFetchLatestExecution.mockReset();
  mockFetchLatestExecution.mockResolvedValue(execution);
  mockFetchDuneFeeRows.mockResolvedValue(history);
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
  it('never prerenders and keeps one last-good entry, keyed on the deployment, without expiry', async () => {
    const route = await import('./route');
    expect(route.dynamic).toBe('force-dynamic');
    expect(unstableCache).toHaveBeenCalledTimes(1);
    const [, keyParts, options] = unstableCache.mock.calls[0] as unknown as [
      unknown,
      string[],
      Record<string, unknown>,
    ];
    expect(keyParts).toEqual(['buyback-last-good', 'deadbeef']);
    expect(options).toEqual({ revalidate: false, tags: ['buyback-last-good-deadbeef'] });
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
    expect((await get()).status).toBe(200);
    expect(mockFetchLatestExecution.mock.calls[0][0]).toBe('test-key');
    expect(mockFetchDuneFeeRows.mock.calls[0][0]).toBe('test-key');
  });

  it('serves the stats of the execution the probe names, reading both through the Data Cache', async () => {
    const response = await get();

    expect(response.status).toBe(200);
    // The probe is kept for five minutes, a page of an execution for a week.
    expect(mockFetchLatestExecution).toHaveBeenCalledWith('test-key', undefined, {
      cacheSeconds: 5 * 60,
    });
    expect(mockFetchDuneFeeRows).toHaveBeenCalledWith('test-key', undefined, '01EXEC', {
      cacheSeconds: 7 * 24 * 60 * 60,
    });
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

  it('materializes the last-good entry on the first success without a second read', async () => {
    await get();
    expect(cacheStore.size).toBe(1);
    expect(revalidateTag).not.toHaveBeenCalled();
    // The cached entry's own computation re-read Dune once (through the cache in production).
    expect(mockFetchDuneFeeRows).toHaveBeenCalledTimes(2);
    expect(mockFetchLatestExecution).toHaveBeenCalledTimes(2);
  });

  it('serves the last good figures when a later refresh fails', async () => {
    const first = await (await get()).json();

    mockFetchLatestExecution.mockRejectedValue(new Error('Dune API 503: down'));
    const during = await get();
    expect(during.status).toBe(200);
    expect(await during.json()).toEqual(first);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('serves the last good figures when a new execution turns out unusable', async () => {
    const first = await (await get()).json();

    mockFetchLatestExecution.mockResolvedValue({ ...execution, executionId: '01BAD' });
    mockFetchDuneFeeRows.mockResolvedValue({ ...history, rows: [] });
    const during = await get();
    expect(during.status).toBe(200);
    expect(await during.json()).toEqual(first);
  });

  it('follows a new execution and re-materializes the last-good entry at once', async () => {
    const first = await (await get()).json();

    const newer = {
      ...execution,
      executionId: '01NEWER',
      executionEndedAt: '2026-09-18T05:31:00.000Z',
    };
    const newerHistory = {
      rows,
      executionStartedAt: '2026-09-18T05:30:00.000Z',
      executionEndedAt: newer.executionEndedAt,
    };
    mockFetchLatestExecution.mockResolvedValue(newer);
    mockFetchDuneFeeRows.mockResolvedValue(newerHistory);
    const after = await (await get()).json();
    expect(after.updatedAt).toBe(newer.executionEndedAt);
    expect(after.latestDay).toBe('2026-09-17');
    expect(revalidateTag).toHaveBeenCalledWith('buyback-last-good-deadbeef');
    // The entry was rebuilt in the same request: an outage now serves the newer figures.
    mockFetchLatestExecution.mockRejectedValue(new Error('Dune API 503: down'));
    expect(await (await get()).json()).toEqual(after);
    expect(after).not.toEqual(first);
  });

  it('returns a generic 500 when nothing good was ever loaded and Dune cannot be read', async () => {
    mockFetchDuneFeeRows.mockRejectedValue(new Error('Dune API 402: Payment Required'));
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
});
