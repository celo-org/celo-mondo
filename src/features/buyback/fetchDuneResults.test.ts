// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fanOutRows from './__fixtures__/duneEigenDaFanOutRows.json';
import realRows from './__fixtures__/duneFeeRows.json';
import {
  CELO_PNL_QUERY_ID,
  DuneRequestError,
  fetchDuneFeeRows,
  fetchLatestExecution,
  parseDuneFeeRows,
} from './fetchDuneResults';
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

describe('fetchLatestExecution', () => {
  it('reads one row of the latest results and reports which execution they come from', async () => {
    fetchMock.mockResolvedValueOnce(
      page([row('2026-09-16')], 558, {
        next_offset: 1,
        execution_started_at: '2026-09-17T16:29:45.379407Z',
        execution_ended_at: '2026-09-17T16:29:54.146577Z',
      }),
    );
    const latest = await fetchLatestExecution('k');
    expect(latest).toEqual({
      executionId: '01EXEC',
      state: 'QUERY_STATE_COMPLETED',
      executionStartedAt: '2026-09-17T16:29:45.379407Z',
      executionEndedAt: '2026-09-17T16:29:54.146577Z',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrls()[0]).toBe(
      `https://api.dune.com/api/v1/query/${CELO_PNL_QUERY_ID}/results?limit=1&offset=0`,
    );
  });

  it('does not validate the sampled row, leaving that verdict to the history read', async () => {
    fetchMock.mockResolvedValueOnce(page([{ ...row('2026-09-16'), fee_CELO: 'oops' }], 558));
    expect((await fetchLatestExecution('k')).executionId).toBe('01EXEC');
  });

  it('refuses a result that names no execution, as something to retry soon', async () => {
    fetchMock.mockResolvedValueOnce(page([row('2026-09-16')], 1, { execution_id: undefined }));
    const error = await fetchLatestExecution('k').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DuneRequestError);
    expect((error as Error).message).toContain('named no execution');
  });

  it('reports a failed or running execution by id and state instead of throwing', async () => {
    for (const state of ['QUERY_STATE_FAILED', 'QUERY_STATE_EXECUTING']) {
      fetchMock.mockResolvedValueOnce(page([], 0, { state, result: undefined }));
      expect(await fetchLatestExecution('k')).toMatchObject({ executionId: '01EXEC', state });
    }
  });
});

describe('fetchDuneFeeRows', () => {
  it('reads every page from the given execution when one is named', async () => {
    fetchMock
      .mockResolvedValueOnce(page(fullPage(0), 150, { next_offset: 100, execution_id: '01OLD' }))
      .mockResolvedValueOnce(page(fullPage(100).slice(0, 50), 150, { execution_id: '01OLD' }));
    const { rows } = await fetchDuneFeeRows('k', CELO_PNL_QUERY_ID, '01GIVEN');
    expect(rows).toHaveLength(150);
    expect(calledUrls()).toEqual([
      'https://api.dune.com/api/v1/execution/01GIVEN/results?limit=100&offset=0',
      'https://api.dune.com/api/v1/execution/01GIVEN/results?limit=100&offset=100',
    ]);
  });

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
    // Without a cache lifetime the read bypasses Next's Data Cache.
    expect(init.cache).toBe('no-store');
    expect(init.next).toBeUndefined();
  });

  it('asks Next to keep a successful response for the given lifetime, tagged', async () => {
    fetchMock.mockResolvedValueOnce(page([row('2026-09-16')], 1));
    await fetchDuneFeeRows('secret', CELO_PNL_QUERY_ID, null, { cacheSeconds: 604_800 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.cache).toBeUndefined();
    expect(init.next).toEqual({ revalidate: 604_800, tags: ['buyback-dune'] });

    fetchMock.mockResolvedValueOnce(page([row('2026-09-16')], 1));
    await fetchLatestExecution('secret', CELO_PNL_QUERY_ID, { cacheSeconds: 300 });
    expect(fetchMock.mock.calls[1][1].next).toEqual({ revalidate: 300, tags: ['buyback-dune'] });
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

  it('returns null timestamps when Dune does not report them', async () => {
    fetchMock.mockResolvedValueOnce(page([row(dayAt(0))], 1));
    const { rows, executionStartedAt, executionEndedAt } = await fetchDuneFeeRows('k');
    expect(rows).toHaveLength(1);
    expect(executionStartedAt).toBeNull();
    expect(executionEndedAt).toBeNull();
  });

  it('lets the caller target a different query id', async () => {
    fetchMock.mockResolvedValueOnce(page([row(dayAt(0))], 1));
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
      ['a negative fee', { fee_USDT: -1 }, '0.fee_USDT'],
      ['a negative cost', { batcher_cost_eth: -0.001 }, '0.batcher_cost_eth'],
      ['a negative price', { eth_price_usd: -2500 }, '0.eth_price_usd'],
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

    it.each(['2026-99-99', '2026-02-30', '2026-05-01garbage', '2026-05-012 00:00:00.000 UTC'])(
      'rejects %j as a day: shaped like one but not a real, cleanly delimited date',
      async (day) => {
        fetchMock.mockResolvedValueOnce(withRow({ ...valid, day }));
        await expect(fetchDuneFeeRows('k')).rejects.toThrow(
          'malformed row (0.day: not a UTC calendar day)',
        );
      },
    );

    it.each(['2026-05-01', '2026-05-01T00:00:00Z', '2028-02-29 00:00:00.000 UTC'])(
      'accepts %j as a day',
      async (day) => {
        fetchMock.mockResolvedValueOnce(withRow({ ...valid, day }));
        expect((await fetchDuneFeeRows('k')).rows[0].day).toBe(day);
      },
    );

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
    it('surfaces HTTP errors such as the 402 datapoint cap as request errors with the body', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('{"error":"Payment Required: datapoints limit exceeded"}', { status: 402 }),
      );
      const error = await fetchDuneFeeRows('k').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DuneRequestError);
      expect((error as DuneRequestError).status).toBe(402);
      expect((error as Error).message).toBe(
        'Dune API 402: {"error":"Payment Required: datapoints limit exceeded"}',
      );
    });

    it('reports a truncated or garbled body as a request error, not a bad execution', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"state":"QUERY_STATE_COMPL', { status: 200 }));
      const error = await fetchDuneFeeRows('k').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DuneRequestError);
      expect((error as Error).message).toContain('unreachable');
    });

    it.each(['null', '[]', '"ok"', '42'])(
      'reports a %s body as a request error, not a bad execution',
      async (body) => {
        fetchMock.mockResolvedValueOnce(new Response(body, { status: 200 }));
        const error = await fetchDuneFeeRows('k').catch((e: unknown) => e);
        expect(error).toBeInstanceOf(DuneRequestError);
        expect((error as Error).message).toContain('body');
      },
    );

    it('reports a network failure or timeout as a request error, not a bad execution', async () => {
      fetchMock.mockRejectedValueOnce(new DOMException('The operation timed out', 'TimeoutError'));
      const error = await fetchDuneFeeRows('k').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DuneRequestError);
      expect((error as DuneRequestError).status).toBeNull();
      expect((error as Error).message).toContain('unreachable');
    });

    it('does not label a validation failure as a request error', async () => {
      fetchMock.mockResolvedValueOnce(page([row('2026-05-01')], 543));
      const error = await fetchDuneFeeRows('k').catch((e: unknown) => e);
      expect(error).not.toBeInstanceOf(DuneRequestError);
      expect((error as Error).message).toContain('Dune returned 1 of 543 rows');
    });

    it.each([
      'QUERY_STATE_FAILED',
      'QUERY_STATE_CANCELLED',
      'QUERY_STATE_EXPIRED',
      'QUERY_STATE_COMPLETED_PARTIAL',
    ])('a 200 response whose execution ended as %s, as a verdict on it', async (state) => {
      fetchMock.mockResolvedValueOnce(page([row(dayAt(0))], 1, { state }));
      const error = await fetchDuneFeeRows('k').catch((e: unknown) => e);
      expect(error).not.toBeInstanceOf(DuneRequestError);
      expect((error as Error).message).toContain(`no completed result (state ${state})`);
    });

    it.each(['QUERY_STATE_PENDING', 'QUERY_STATE_EXECUTING'])(
      'an execution that is still %s, as something to retry soon',
      async (state) => {
        fetchMock.mockResolvedValueOnce(page([], 0, { state, result: undefined }));
        const error = await fetchDuneFeeRows('k').catch((e: unknown) => e);
        expect(error).toBeInstanceOf(DuneRequestError);
        expect((error as Error).message).toContain(`still executing (state ${state})`);
      },
    );

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

    it('a completed execution with no rows at all', async () => {
      // What a broken query edit or an upstream data failure looks like.
      fetchMock.mockResolvedValueOnce(page([], 0));
      await expect(fetchDuneFeeRows('k')).rejects.toThrow('completed with no rows');
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
