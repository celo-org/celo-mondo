// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CELO_PNL_QUERY_ID, fetchDuneFeeRows } from './fetchDuneResults';
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchDuneFeeRows', () => {
  it('reads the cached results with the API key and stops after a short page', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        execution_ended_at: '2026-09-17T16:29:54.146577Z',
        result: { rows: [row('2026-09-16'), row('2026-09-17')] },
      }),
    );

    const { rows, executionEndedAt } = await fetchDuneFeeRows('secret');

    expect(rows.map((r) => r.day)).toEqual(['2026-09-16', '2026-09-17']);
    expect(executionEndedAt).toBe('2026-09-17T16:29:54.146577Z');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://api.dune.com/api/v1/query/${CELO_PNL_QUERY_ID}/results?limit=100&offset=0`,
    );
    expect(init.headers).toEqual({ 'X-Dune-API-Key': 'secret' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('pages in blocks of 100 until the query is exhausted', async () => {
    const page = (n: number, size: number) =>
      jsonResponse({ result: { rows: Array.from({ length: size }, (_, i) => row(`p${n}-${i}`)) } });
    fetchMock
      .mockResolvedValueOnce(page(0, 100))
      .mockResolvedValueOnce(page(1, 100))
      .mockResolvedValueOnce(page(2, 43));

    const { rows } = await fetchDuneFeeRows('k');

    expect(rows).toHaveLength(243);
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).searchParams.get('offset'))).toEqual([
      '0',
      '100',
      '200',
    ]);
  });

  it('keeps the execution timestamp from the first page', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          execution_ended_at: 'first',
          result: { rows: Array.from({ length: 100 }, () => row('x')) },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ execution_ended_at: 'second', result: { rows: [] } }));

    expect((await fetchDuneFeeRows('k')).executionEndedAt).toBe('first');
  });

  it('returns null when Dune does not report an execution time', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ result: { rows: [] } }));
    const { rows, executionEndedAt } = await fetchDuneFeeRows('k');
    expect(rows).toEqual([]);
    expect(executionEndedAt).toBeNull();
  });

  it('surfaces Dune errors such as the 402 datapoint cap with the response body', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":"Payment Required: datapoints limit exceeded"}', { status: 402 }),
    );
    await expect(fetchDuneFeeRows('k')).rejects.toThrow(
      'Dune API 402: {"error":"Payment Required: datapoints limit exceeded"}',
    );
  });

  it('reads later pages from the execution named by the first page', async () => {
    const full = () => Array.from({ length: 100 }, (_, i) => row(`d${i}`));
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ execution_id: '01EXEC', next_offset: 100, result: { rows: full() } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ execution_id: '01EXEC', next_offset: 200, result: { rows: full() } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ execution_id: '01EXEC', result: { rows: [row('last')] } }),
      );

    const { rows } = await fetchDuneFeeRows('k');

    expect(rows).toHaveLength(201);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `https://api.dune.com/api/v1/query/${CELO_PNL_QUERY_ID}/results?limit=100&offset=0`,
      'https://api.dune.com/api/v1/execution/01EXEC/results?limit=100&offset=100',
      'https://api.dune.com/api/v1/execution/01EXEC/results?limit=100&offset=200',
    ]);
  });

  it('stops as soon as Dune omits next_offset, even on a full page', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        result: {
          rows: Array.from({ length: 100 }, () => row('x')),
          metadata: { total_row_count: 100 },
        },
        next_offset: undefined,
      }),
    );
    // Without next_offset the client falls back to probing one more page.
    fetchMock.mockResolvedValueOnce(jsonResponse({ result: { rows: [] } }));
    const { rows } = await fetchDuneFeeRows('k');
    expect(rows).toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refuses to return a truncated history', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ result: { rows: [row('a'), row('b')], metadata: { total_row_count: 543 } } }),
    );
    await expect(fetchDuneFeeRows('k')).rejects.toThrow('Dune returned 2 of 543 rows');
  });

  it('refuses histories beyond the row cap instead of silently cutting them', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ result: { rows: Array.from({ length: 100 }, () => row('x')) } }),
    );
    await expect(fetchDuneFeeRows('k')).rejects.toThrow('more than 10000 rows');
    expect(fetchMock).toHaveBeenCalledTimes(100);
  });

  it('lets the caller target a different query id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ result: { rows: [] } }));
    await fetchDuneFeeRows('k', 42);
    expect(fetchMock.mock.calls[0][0]).toContain('/query/42/results');
  });
});
