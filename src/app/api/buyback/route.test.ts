// @vitest-environment node
import duneFeeRows from 'src/features/buyback/__fixtures__/duneFeeRows.json';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { DuneFeeRow } from 'src/features/buyback/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real unstable_cache needs Next's request store; a pass-through keeps the
// handler testable while still recording how the cache is configured.
const unstableCache = vi.hoisted(() => vi.fn(<T>(fn: T): T => fn));
vi.mock('next/cache', () => ({ unstable_cache: unstableCache }));

const mockFetchDuneFeeRows = vi.fn();
vi.mock('src/features/buyback/fetchDuneResults', () => ({
  fetchDuneFeeRows: (...args: unknown[]) => mockFetchDuneFeeRows(...args),
}));

vi.mock('src/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const rows = duneFeeRows as DuneFeeRow[];
const executionStartedAt = '2026-09-17T16:29:45.379407Z';
const executionEndedAt = '2026-09-17T16:29:54.146577Z';

beforeEach(() => {
  mockFetchDuneFeeRows.mockReset();
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
  it('caches the Dune read explicitly for 15 minutes and never prerenders', async () => {
    const route = await import('./route');
    expect(route.dynamic).toBe('force-dynamic');
    expect(unstableCache).toHaveBeenCalledTimes(1);
    const [, keyParts, options] = unstableCache.mock.calls[0] as unknown as [
      unknown,
      string[],
      { revalidate: number },
    ];
    expect(keyParts).toEqual(['buyback-stats']);
    expect(options).toEqual({ revalidate: 900 });
  });

  it('returns 503 when no Dune key is configured', async () => {
    vi.stubEnv('DUNE_API_KEY', '');
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('DUNE_API_KEY');
    expect(mockFetchDuneFeeRows).not.toHaveBeenCalled();
  });

  it('serves the stats computed from the Dune rows, stamped with the execution time', async () => {
    mockFetchDuneFeeRows.mockResolvedValueOnce({ rows, executionStartedAt, executionEndedAt });

    const response = await get();

    expect(response.status).toBe(200);
    // The key is read from the environment, never passed through the cache key.
    expect(mockFetchDuneFeeRows).toHaveBeenCalledWith('test-key');
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
});
