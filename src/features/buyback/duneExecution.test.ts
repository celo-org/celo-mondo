// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeDuneQuery, waitForExecution } from './duneExecution';
import { DuneRequestError } from './fetchDuneResults';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const status = (
  state: string,
  finished = state !== 'QUERY_STATE_PENDING' && state !== 'QUERY_STATE_EXECUTING',
  times: Record<string, string> = {},
) => jsonResponse({ execution_id: '01EXEC', state, is_execution_finished: finished, ...times });

const fetchMock = vi.fn();
const log = vi.fn();
const fast = { pollIntervalMs: 0, timeoutMs: 1_000, log };

beforeEach(() => {
  fetchMock.mockReset();
  log.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('executeDuneQuery', () => {
  it('starts an execution with one POST on the default tier and returns its id', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ execution_id: '01NEW', state: 'QUERY_STATE_PENDING' }),
    );
    expect(await executeDuneQuery('secret', 6898547)).toBe('01NEW');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.dune.com/api/v1/query/6898547/execute');
    expect(init.method).toBe('POST');
    // No performance tier: Dune rejects "medium" and "large".
    expect(init.body).toBe('{}');
    expect(init.headers).toEqual({
      'X-Dune-API-Key': 'secret',
      'Content-Type': 'application/json',
    });
  });

  it('surfaces a refusal, such as an exhausted budget, with its reason and never resends', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":"would exceed your configured datapoint limit"}', { status: 402 }),
    );
    const error = await executeDuneQuery('k', 6898547).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DuneRequestError);
    expect((error as DuneRequestError).status).toBe(402);
    expect((error as Error).message).toContain('datapoint limit');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([{}, { execution_id: '' }, { execution_id: 42 }])(
    'refuses an answer without an execution id (%j)',
    async (body) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(body));
      await expect(executeDuneQuery('k', 6898547)).rejects.toThrow(
        'Dune did not return an execution id for query 6898547',
      );
    },
  );

  it('reports a garbled answer as a request error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('null', { status: 200 }));
    await expect(executeDuneQuery('k', 6898547)).rejects.toBeInstanceOf(DuneRequestError);
  });
});

describe('waitForExecution', () => {
  it('polls the status until the execution completes', async () => {
    fetchMock
      .mockResolvedValueOnce(status('QUERY_STATE_PENDING'))
      .mockResolvedValueOnce(status('QUERY_STATE_EXECUTING'))
      .mockResolvedValueOnce(status('QUERY_STATE_COMPLETED'));
    const outcome = await waitForExecution('secret', '01EXEC', fast);
    expect(outcome).toEqual({
      executionId: '01EXEC',
      state: 'QUERY_STATE_COMPLETED',
      completed: true,
      executionStartedAt: null,
      executionEndedAt: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      Array(3).fill('https://api.dune.com/api/v1/execution/01EXEC/status'),
    );
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'X-Dune-API-Key': 'secret' });
    expect(log).toHaveBeenCalledWith('State: QUERY_STATE_PENDING, waiting...');
  });

  it.each(['QUERY_STATE_FAILED', 'QUERY_STATE_CANCELLED', 'QUERY_STATE_EXPIRED'])(
    'reports an execution that ended as %s without throwing',
    async (state) => {
      fetchMock.mockResolvedValueOnce(status(state));
      expect(await waitForExecution('k', '01EXEC', fast)).toEqual({
        executionId: '01EXEC',
        state,
        completed: false,
        executionStartedAt: null,
        executionEndedAt: null,
      });
    },
  );

  it('reports when the execution started and ended, as a queued one starts late', async () => {
    fetchMock.mockResolvedValueOnce(
      status('QUERY_STATE_COMPLETED', true, {
        execution_started_at: '2026-09-18T05:35:00.000000Z',
        execution_ended_at: '2026-09-18T05:35:20.000000Z',
      }),
    );
    expect(await waitForExecution('k', '01EXEC', fast)).toMatchObject({
      executionStartedAt: '2026-09-18T05:35:00.000000Z',
      executionEndedAt: '2026-09-18T05:35:20.000000Z',
    });
  });

  it('treats a terminal state as finished even without the finished flag', async () => {
    fetchMock.mockResolvedValueOnce(status('QUERY_STATE_COMPLETED', false));
    expect((await waitForExecution('k', '01EXEC', fast)).completed).toBe(true);
  });

  it('retries after a failed status request or an unreadable status body', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('upstream error', { status: 502 }))
      .mockRejectedValueOnce(new DOMException('The operation timed out', 'TimeoutError'))
      .mockResolvedValueOnce(new Response('{"state":"QUERY_STATE_EXEC', { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ execution_id: '01EXEC' }))
      .mockResolvedValueOnce(status('QUERY_STATE_COMPLETED'));
    expect((await waitForExecution('k', '01EXEC', fast)).completed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Status check failed (Dune API 502'));
    expect(log).toHaveBeenCalledWith('Unreadable status response, retrying...');
  });

  it('gives up once the timeout passes while the execution is still running', async () => {
    fetchMock.mockResolvedValue(status('QUERY_STATE_EXECUTING'));
    await expect(waitForExecution('k', '01EXEC', { ...fast, timeoutMs: 0 })).rejects.toThrow(
      'Timed out waiting for Dune execution 01EXEC',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up on the timeout even if the status was never readable', async () => {
    fetchMock.mockResolvedValue(new Response('down', { status: 503 }));
    await expect(waitForExecution('k', '01EXEC', { ...fast, timeoutMs: 0 })).rejects.toThrow(
      'Timed out waiting for Dune execution 01EXEC',
    );
  });
});
