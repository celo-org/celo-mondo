// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fanOutRows from './__fixtures__/duneEigenDaFanOutRows.json';
import realRows from './__fixtures__/duneFeeRows.json';
import { CELO_PNL_QUERY_ID, fetchDuneFeeRows, parseDuneFeeRows } from './fetchDuneResults';
import { DuneFeeRow } from './types';

const row = (day: string): DuneFeeRow => ({
  day,
  fee_CELO: 1,
  fee_USDT: 0,
  fee_USDm: 0,
  fee_EURm: 0,
  fee_USDC: 0,
  fee_CELO_usd: 0.1,
  fee_EURm_usd: 0,
  others_usd: 0,
  batcher_cost_eth: 0,
  proposer_cost_eth: 0,
  challenger_cost_eth: 0,
  EigenDA_cost_eth: null,
  eth_price_usd: 1000,
});

// Distinct, valid UTC days: every row Dune returns has one.
const dayAt = (index: number) =>
  new Date(Date.UTC(2026, 0, 1) + index * 86_400_000).toISOString().slice(0, 10);
const fullPage = (firstDay = 0) => Array.from({ length: 100 }, (_, i) => row(dayAt(firstDay + i)));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * A results page shaped like Dune's: completed state, the rows, and the total
 * row count of the execution. `extra` overrides or adds top-level fields.
 */
function page(rows: DuneFeeRow[], total: number, extra: Record<string, unknown> = {}) {
  return jsonResponse({
    state: 'QUERY_STATE_COMPLETED',
    execution_id: '01EXEC',
    result: { rows, metadata: { total_row_count: total } },
    ...extra,
  });
}

const fetchMock = vi.fn();
const calledUrls = () => fetchMock.mock.calls.map(([url]) => url as string);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchDuneFeeRows', () => {
  it('reads the cached results with the API key in a single request', async () => {
    fetchMock.mockResolvedValueOnce(
      page([row('2026-09-16'), row('2026-09-17')], 2, {
        execution_started_at: '2026-09-17T16:29:45.379407Z',
        execution_ended_at: '2026-09-17T16:29:54.146577Z',
      }),
    );

    const { rows, executionStartedAt, executionEndedAt } = await fetchDuneFeeRows('secret');

    expect(rows.map((r) => r.day)).toEqual(['2026-09-16', '2026-09-17']);
    expect(executionStartedAt).toBe('2026-09-17T16:29:45.379407Z');
    expect(executionEndedAt).toBe('2026-09-17T16:29:54.146577Z');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://api.dune.com/api/v1/query/${CELO_PNL_QUERY_ID}/results?limit=100&offset=0`,
    );
    expect(init.headers).toEqual({ 'X-Dune-API-Key': 'secret' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('follows next_offset and reads later pages from the execution named by the first', async () => {
    fetchMock
      .mockResolvedValueOnce(page(fullPage(0), 243, { next_offset: 100 }))
      .mockResolvedValueOnce(page(fullPage(100), 243, { next_offset: 200 }))
      .mockResolvedValueOnce(
        page(
          fullPage(200).slice(0, 43),
          243,
          // A refresh finished meanwhile; the pinned read must not care.
          { execution_id: '01OTHER' },
        ),
      );

    const { rows } = await fetchDuneFeeRows('k');

    expect(rows).toHaveLength(243);
    expect(calledUrls()).toEqual([
      `https://api.dune.com/api/v1/query/${CELO_PNL_QUERY_ID}/results?limit=100&offset=0`,
      'https://api.dune.com/api/v1/execution/01EXEC/results?limit=100&offset=100',
      'https://api.dune.com/api/v1/execution/01EXEC/results?limit=100&offset=200',
    ]);
  });

  it('needs no extra request when the history is an exact multiple of the page size', async () => {
    fetchMock
      .mockResolvedValueOnce(page(fullPage(0), 200, { next_offset: 100 }))
      .mockResolvedValueOnce(page(fullPage(100), 200));

    const { rows } = await fetchDuneFeeRows('k');

    expect(rows).toHaveLength(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the execution timestamps from the first page', async () => {
    fetchMock
      .mockResolvedValueOnce(
        page(fullPage(), 100 + 1, {
          next_offset: 100,
          execution_started_at: 'first-start',
          execution_ended_at: 'first-end',
        }),
      )
      .mockResolvedValueOnce(
        page([row(dayAt(100))], 101, {
          execution_started_at: 'second-start',
          execution_ended_at: 'second-end',
        }),
      );

    const result = await fetchDuneFeeRows('k');
    expect(result.executionStartedAt).toBe('first-start');
    expect(result.executionEndedAt).toBe('first-end');
  });

  it('returns null timestamps when Dune does not report them, and an empty history as empty', async () => {
    fetchMock.mockResolvedValueOnce(page([], 0));
    const { rows, executionStartedAt, executionEndedAt } = await fetchDuneFeeRows('k');
    expect(rows).toEqual([]);
    expect(executionStartedAt).toBeNull();
    expect(executionEndedAt).toBeNull();
  });

  it('lets the caller target a different query id', async () => {
    fetchMock.mockResolvedValueOnce(page([], 0));
    await fetchDuneFeeRows('k', 42);
    expect(calledUrls()[0]).toContain('/query/42/results');
  });

  describe('row validation', () => {
    const valid = row('2026-05-01');
    const withRow = (candidate: unknown) => page([candidate as DuneFeeRow], 1);

    it('accepts every real row the query has returned, including the fan-out copies', () => {
      expect(parseDuneFeeRows(realRows, CELO_PNL_QUERY_ID)).toHaveLength(realRows.length);
      expect(parseDuneFeeRows(fanOutRows, CELO_PNL_QUERY_ID)).toHaveLength(3);
    });

    it('accepts Dune timestamps as days and drops columns the dashboard does not read', async () => {
      fetchMock.mockResolvedValueOnce(
        withRow({ ...valid, day: '2026-05-01 00:00:00.000 UTC', fee_USDT_usd: 12.5 }),
      );
      const { rows } = await fetchDuneFeeRows('k');
      expect(rows).toEqual([{ ...valid, day: '2026-05-01 00:00:00.000 UTC' }]);
    });

    it.each([
      'batcher_cost_eth',
      'proposer_cost_eth',
      'challenger_cost_eth',
      'EigenDA_cost_eth',
      'eth_price_usd',
    ] as const)('allows null in %s, which the query fills through a LEFT JOIN', async (column) => {
      fetchMock.mockResolvedValueOnce(withRow({ ...valid, [column]: null }));
      const { rows } = await fetchDuneFeeRows('k');
      expect(rows[0][column]).toBeNull();
    });

    it.each([
      'fee_CELO',
      'fee_USDT',
      'fee_CELO_usd',
      'others_usd',
      'eth_price_usd',
      'day',
    ] as const)(
      'rejects a result in which %s is missing, as after a column rename',
      async (column) => {
        const renamed: Record<string, unknown> = { ...valid, [`${column}_v2`]: valid[column] };
        delete renamed[column];
        fetchMock.mockResolvedValueOnce(withRow(renamed));
        await expect(fetchDuneFeeRows('k')).rejects.toThrow(`malformed row (0.${column}:`);
      },
    );

    it.each([
      ['a null fee', { fee_CELO: null }, '0.fee_CELO'],
      ['a numeric string', { fee_USDT: '500' }, '0.fee_USDT'],
      ['text', { fee_CELO_usd: 'n/a' }, '0.fee_CELO_usd'],
      ['a boolean', { batcher_cost_eth: true }, '0.batcher_cost_eth'],
      ['a non-day', { day: 'yesterday' }, '0.day'],
      ['a null day', { day: null }, '0.day'],
    ])('rejects %s in a column', async (_label, change, path) => {
      fetchMock.mockResolvedValueOnce(withRow({ ...valid, ...change }));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow(`malformed row (${path}:`);
    });

    it('names the offending row when a later one is malformed', async () => {
      fetchMock.mockResolvedValueOnce(
        page(
          [
            valid,
            row('2026-05-02'),
            { ...row('2026-05-03'), others_usd: undefined } as unknown as DuneFeeRow,
          ],
          3,
        ),
      );
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('malformed row (2.others_usd:');
    });

    it('rejects a malformed row on a later page instead of returning the first pages', async () => {
      fetchMock
        .mockResolvedValueOnce(page(fullPage(), 101, { next_offset: 100 }))
        .mockResolvedValueOnce(withRow({ ...row(dayAt(100)), fee_CELO: 'oops' }));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('malformed row (0.fee_CELO:');
    });
  });

  describe('refuses anything short of a complete, completed history', () => {
    it('surfaces HTTP errors such as the 402 datapoint cap with the response body', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('{"error":"Payment Required: datapoints limit exceeded"}', { status: 402 }),
      );
      await expect(fetchDuneFeeRows('k')).rejects.toThrow(
        'Dune API 402: {"error":"Payment Required: datapoints limit exceeded"}',
      );
    });

    it.each([
      'QUERY_STATE_FAILED',
      'QUERY_STATE_CANCELLED',
      'QUERY_STATE_EXPIRED',
      'QUERY_STATE_COMPLETED_PARTIAL',
      'QUERY_STATE_EXECUTING',
    ])('a 200 response whose execution is %s', async (state) => {
      fetchMock.mockResolvedValueOnce(page([row(dayAt(0))], 1, { state }));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow(`no completed result (state ${state})`);
    });

    it('a response without a state or without a result payload', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ result: { rows: [row(dayAt(0))] } }));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('no completed result (state missing)');

      fetchMock.mockResolvedValueOnce(
        jsonResponse({ state: 'QUERY_STATE_COMPLETED', error: 'execution failed' }),
      );
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('no completed result');

      fetchMock.mockResolvedValueOnce(jsonResponse({ state: 'QUERY_STATE_COMPLETED', result: {} }));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('no completed result');
    });

    it('a later page that is not completed, instead of returning the first pages', async () => {
      fetchMock
        .mockResolvedValueOnce(page(fullPage(), 150, { next_offset: 100 }))
        .mockResolvedValueOnce(jsonResponse({ state: 'QUERY_STATE_FAILED' }));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('state QUERY_STATE_FAILED');
    });

    it('fewer rows than Dune says the execution has', async () => {
      fetchMock.mockResolvedValueOnce(page([row(dayAt(0)), row(dayAt(1))], 543));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('Dune returned 2 of 543 rows');
    });

    it('a full first page with no next_offset when more rows exist', async () => {
      fetchMock.mockResolvedValueOnce(page(fullPage(), 543));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('Dune returned 100 of 543 rows');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('a response that does not report its row count', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ state: 'QUERY_STATE_COMPLETED', result: { rows: [row(dayAt(0))] } }),
      );
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('did not report its row count');
    });

    it('paging that does not advance', async () => {
      fetchMock.mockResolvedValue(page([], 500, { next_offset: 0 }));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('did not advance past offset 0');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockReset();
      fetchMock
        .mockResolvedValueOnce(page(fullPage(), 500, { next_offset: 100 }))
        .mockResolvedValueOnce(page(fullPage(), 500, { next_offset: 100 }));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('did not advance past offset 100');
    });

    it('more pages without an execution id to pin them to', async () => {
      fetchMock.mockResolvedValueOnce(
        page(fullPage(), 500, { next_offset: 100, execution_id: undefined }),
      );
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('named no execution to read');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('a history beyond the row cap, instead of silently cutting it', async () => {
      let offset = 0;
      fetchMock.mockImplementation(async () => {
        offset += 100;
        return page(fullPage(), 1_000_000, { next_offset: offset });
      });
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('more than 10000 rows');
      expect(fetchMock).toHaveBeenCalledTimes(100);
    });
  });
});
