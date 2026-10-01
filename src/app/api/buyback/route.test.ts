// @vitest-environment node
import duneFeeRows from 'src/features/buyback/__fixtures__/duneFeeRows.json';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { DuneFeeRow } from 'src/features/buyback/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchDuneFeeRows = vi.fn();
vi.mock('src/features/buyback/fetchDuneResults', () => ({
  fetchDuneFeeRows: (...args: unknown[]) => mockFetchDuneFeeRows(...args),
}));

vi.mock('src/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const rows = duneFeeRows as DuneFeeRow[];
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
  it('returns 503 when no Dune key is configured', async () => {
    vi.stubEnv('DUNE_API_KEY', '');
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('DUNE_API_KEY');
    expect(mockFetchDuneFeeRows).not.toHaveBeenCalled();
  });

  it('serves the stats computed from the Dune rows, stamped with the execution time', async () => {
    mockFetchDuneFeeRows.mockResolvedValueOnce({ rows, executionEndedAt });

    const response = await get();

    expect(response.status).toBe(200);
    expect(mockFetchDuneFeeRows).toHaveBeenCalledWith('test-key');
    const body = await response.json();
    const want = computeBuybackStats(rows, { executionEndedAt, now: new Date() });
    expect(body).toEqual(JSON.parse(JSON.stringify(want)));
    expect(body.updatedAt).toBe(executionEndedAt);
    expect(body.sinceDay).toBe('2026-04-09');
    expect(body.latestDay).toBe('2026-09-17');
    expect(body.totals.celoToCommunityFund).toBeGreaterThan(0);
  });

  it('returns 500 with the reason when Dune cannot be read', async () => {
    mockFetchDuneFeeRows.mockRejectedValueOnce(new Error('Dune API 402: Payment Required'));
    const response = await get();
    expect(response.status).toBe(500);
    expect(await response.text()).toContain('Dune API 402');
  });
});
