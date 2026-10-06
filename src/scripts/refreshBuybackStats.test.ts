// @vitest-environment node
import { buybackStatsTable } from 'src/db/schema';
import duneFeeRows from 'src/features/buyback/__fixtures__/duneFeeRows.json';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { DuneRequestError } from 'src/features/buyback/fetchDuneResults';
import { DuneFeeRow } from 'src/features/buyback/types';
import testDatabase from 'src/test/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Database,
  RECENT_SECONDS,
  REFRESH_TIME_UTC,
  planRefresh,
  refreshBuybackStats,
} from './refreshBuybackStats';

const rows = duneFeeRows as DuneFeeRow[];
// A scheduled run the morning after the fixture's execution.
const now = new Date('2026-09-18T05:40:00.000Z');
const scheduled = { scheduled: true, force: false, now };
const manual = { ...scheduled, scheduled: false };

const execution = (
  state: string,
  executionStartedAt: string | null,
  executionId = '01EXEC',
  executionEndedAt: string | null = null,
  submittedAt: string | null = null,
) => ({ executionId, state, submittedAt, executionStartedAt, executionEndedAt });

describe('planRefresh', () => {
  it('executes when forced, whatever Dune has', () => {
    const latest = execution('QUERY_STATE_EXECUTING', '2026-09-18T05:30:30Z');
    expect(planRefresh(latest, { ...scheduled, force: true })).toEqual({
      kind: 'execute',
      reason: 'forced',
    });
  });

  it('executes when the latest execution could not be read', () => {
    expect(planRefresh(null, scheduled).kind).toBe('execute');
  });

  it.each([
    ['yesterday', '2026-09-17T16:29:45.379407Z'],
    ['today before the refresh time', '2026-09-18T05:29:59Z'],
    ['today at an impossible time', '2026-09-18T05:60:00Z'],
    ['an impossible date', '2026-09-31T05:40:00Z'],
    ['a timestamp in another zone', '2026-09-18T07:40:00+02:00'],
    ['a malformed timestamp', 'today'],
    ['no timestamp', null],
  ])('executes on a scheduled run when the latest completed execution started %s', (_, at) => {
    expect(planRefresh(execution('QUERY_STATE_COMPLETED', at), scheduled).kind).toBe('execute');
  });

  it('uses a completed execution that started today at or after the refresh time', () => {
    for (const at of [`2026-09-18T${REFRESH_TIME_UTC}Z`, '2026-09-18T05:30:00.000001Z']) {
      for (const context of [scheduled, manual]) {
        expect(planRefresh(execution('QUERY_STATE_COMPLETED', at), context)).toEqual({
          kind: 'use',
          executionId: '01EXEC',
          reason: expect.stringContaining('already executed the query today'),
        });
      }
    }
  });

  it('uses a recently completed execution on a manual run only', () => {
    const recent = execution('QUERY_STATE_COMPLETED', '2026-09-18T05:15:00Z');
    expect(planRefresh(recent, manual)).toMatchObject({ kind: 'use', executionId: '01EXEC' });
    expect(planRefresh(recent, scheduled).kind).toBe('execute');
    const older = execution(
      'QUERY_STATE_COMPLETED',
      new Date(now.getTime() - (RECENT_SECONDS + 1) * 1000).toISOString(),
    );
    expect(planRefresh(older, manual).kind).toBe('execute');
  });

  it('ignores an execution from the future instead of standing down for it', () => {
    const future = execution('QUERY_STATE_COMPLETED', '2026-09-18T05:45:01Z');
    expect(planRefresh(future, scheduled)).toMatchObject({
      kind: 'execute',
      reason: expect.stringContaining('in the future'),
    });
    // A running one is waited for instead: the wait is bounded, and a run
    // that never finishes is replaced.
    expect(
      planRefresh(execution('QUERY_STATE_EXECUTING', '2026-09-18T05:45:01Z'), manual).kind,
    ).toBe('await');
  });

  it('reads a start time a few seconds ahead of its own clock as just now', () => {
    // Dune's clock may run slightly ahead; a run queued right behind an
    // execution must not start a second one.
    const justNow = execution('QUERY_STATE_COMPLETED', '2026-09-18T05:40:10Z');
    expect(planRefresh(justNow, manual)).toMatchObject({ kind: 'use', executionId: '01EXEC' });
    expect(planRefresh(justNow, scheduled)).toMatchObject({ kind: 'use', executionId: '01EXEC' });
    const running = execution('QUERY_STATE_EXECUTING', '2026-09-18T05:44:59Z');
    expect(planRefresh(running, scheduled)).toMatchObject({ kind: 'await', executionId: '01EXEC' });
  });

  it.each(['QUERY_STATE_PENDING', 'QUERY_STATE_EXECUTING'])(
    'waits for a %s execution started after the refresh time and uses it',
    (state) => {
      const running = execution(state, '2026-09-18T05:30:30Z');
      for (const context of [scheduled, manual]) {
        expect(planRefresh(running, context)).toMatchObject({
          kind: 'await',
          executionId: '01EXEC',
        });
      }
    },
  );

  it('waits for a running execution started before the refresh time, then refreshes anyway', () => {
    const early = execution('QUERY_STATE_EXECUTING', '2026-09-18T05:20:00Z');
    expect(planRefresh(early, scheduled)).toMatchObject({
      kind: 'await-then-execute',
      executionId: '01EXEC',
    });
    // A manual run queued behind it is a duplicate of it, not the day's refresh.
    expect(planRefresh(early, manual)).toMatchObject({ kind: 'await', executionId: '01EXEC' });
  });

  it('ages a pending execution, which has not started yet, from its submission', () => {
    const pendingSince = (submittedAt: string) =>
      execution('QUERY_STATE_PENDING', null, '01QUEUED', null, submittedAt);
    // Queued right after the scheduled time: it is the day's refresh.
    expect(planRefresh(pendingSince('2026-09-18T05:30:02Z'), scheduled)).toMatchObject({
      kind: 'await',
      executionId: '01QUEUED',
    });
    // Queued before it: let it finish, then refresh.
    expect(planRefresh(pendingSince('2026-09-18T05:20:00Z'), scheduled)).toMatchObject({
      kind: 'await-then-execute',
      executionId: '01QUEUED',
    });
    // Queued for longer than a refresh takes: stuck.
    expect(planRefresh(pendingSince('2026-09-18T04:00:00Z'), scheduled).kind).toBe('execute');
  });

  it('waits for a pending execution even without any usable timestamp', () => {
    for (const submittedAt of [null, 'soon', '2026-09-18T07:00:00Z']) {
      const queued = execution('QUERY_STATE_PENDING', null, '01QUEUED', null, submittedAt);
      expect(planRefresh(queued, scheduled)).toMatchObject({
        kind: 'await',
        executionId: '01QUEUED',
      });
    }
  });

  it('does not wait for a run that has been going for longer than a refresh takes', () => {
    const stuck = execution('QUERY_STATE_PENDING', '2026-09-18T04:00:00Z');
    expect(planRefresh(stuck, scheduled)).toMatchObject({
      kind: 'execute',
      reason: expect.stringContaining('looks stuck'),
    });
  });

  it.each(['QUERY_STATE_FAILED', 'QUERY_STATE_CANCELLED', 'QUERY_STATE_EXPIRED'])(
    'executes after an execution that ended as %s, even one from after the refresh time',
    (state) => {
      expect(planRefresh(execution(state, '2026-09-18T05:30:30Z'), manual).kind).toBe('execute');
    },
  );
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * A stand-in for the Dune API: responses per "METHOD path", served in order,
 * the last one repeating. An unexpected request fails the test.
 */
type Routes = Record<string, Array<unknown>>;
function duneApi(routes: Routes) {
  const queues = Object.fromEntries(Object.entries(routes).map(([k, v]) => [k, [...v]]));
  return vi.fn(async (input: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${input.replace('https://api.dune.com/api/v1/', '')}`;
    const queue = queues[key];
    if (!queue || queue.length === 0) throw new Error(`unexpected request ${key}`);
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return next instanceof Response ? next : jsonResponse(next);
  });
}

const status = (state: string) => ({ execution_id: '01NEW', state });
const startedAt = '2026-09-18T05:31:10.000000Z';
const endedAt = '2026-09-18T05:31:20.000000Z';

/** The results of an execution as pages of 100 rows. */
function pagesOf(executionId: string, history: DuneFeeRow[], meta: Record<string, unknown> = {}) {
  const pages: Routes = {};
  for (let offset = 0; offset < history.length; offset += 100) {
    const nextOffset = offset + 100 < history.length ? { next_offset: offset + 100 } : {};
    pages[`GET execution/${executionId}/results?limit=100&offset=${offset}`] = [
      {
        state: 'QUERY_STATE_COMPLETED',
        execution_id: executionId,
        execution_started_at: startedAt,
        execution_ended_at: endedAt,
        result: {
          rows: history.slice(offset, offset + 100),
          metadata: { total_row_count: history.length },
        },
        ...nextOffset,
        ...meta,
      },
    ];
  }
  return pages;
}

const yesterdays = {
  'GET query/6898547/results?limit=1&offset=0': [
    {
      state: 'QUERY_STATE_COMPLETED',
      execution_id: '01OLD',
      execution_started_at: '2026-09-17T16:29:45.379407Z',
      result: { rows: [rows[0]], metadata: { total_row_count: rows.length } },
      next_offset: 1,
    },
  ],
};
const executeNew = { 'POST query/6898547/execute': [status('QUERY_STATE_PENDING')] };
const newCompletes = {
  'GET execution/01NEW/status': [status('QUERY_STATE_EXECUTING'), status('QUERY_STATE_COMPLETED')],
};
const expected = computeBuybackStats(rows, {
  executionStartedAt: startedAt,
  executionEndedAt: endedAt,
  now,
});

const log = vi.fn();
let fetchMock: ReturnType<typeof duneApi>;
function serve(routes: Routes) {
  fetchMock = duneApi(routes);
  vi.stubGlobal('fetch', fetchMock);
}
const refresh = (
  { now: at, ...context } = scheduled,
  databases: Database[] = [testDatabase],
  options: { waitTimeoutMs?: number; clock?: () => Date } = {},
) =>
  refreshBuybackStats({
    apiKey: 'k',
    databases,
    log,
    pollIntervalMs: 0,
    clock: () => at,
    ...options,
    ...context,
  });
const storedRows = () => testDatabase.select().from(buybackStatsTable);

beforeEach(() => {
  log.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('refreshBuybackStats', () => {
  it('refuses to run without a database to store into, before touching Dune', async () => {
    serve({});
    await expect(refresh(scheduled, [])).rejects.toThrow('No database to store the stats in');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('executes the query, waits for it, reads every page and stores the figures', async () => {
    serve({ ...yesterdays, ...executeNew, ...newCompletes, ...pagesOf('01NEW', rows) });

    const stats = await refresh();

    expect(stats).toEqual(expected);
    expect(stats.latestDay).toBe('2026-09-17');
    expect(stats.updatedAt).toBe(endedAt);
    const stored = await storedRows();
    expect(stored).toHaveLength(1);
    expect(stored[0].executionId).toBe('01NEW');
    expect(new Date(stored[0].startedAt).toISOString()).toBe(new Date(startedAt).toISOString());
    expect(new Date(stored[0].executedAt).toISOString()).toBe(new Date(endedAt).toISOString());
    expect(stored[0].stats).toEqual(JSON.parse(JSON.stringify(expected)));
    // Probe, execute, two status polls, then the pages of 100 rows.
    expect(fetchMock).toHaveBeenCalledTimes(1 + 1 + 2 + Math.ceil(rows.length / 100));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Plan: execute'));
    expect(log).toHaveBeenCalledWith('Dune execution 01NEW completed');
  });

  it('orders the snapshot by its freshness time when Dune reports no usable start', async () => {
    serve({
      ...yesterdays,
      ...executeNew,
      ...newCompletes,
      ...pagesOf('01NEW', rows, { execution_started_at: undefined }),
    });
    await refresh();
    const [stored] = await storedRows();
    expect(new Date(stored.startedAt).toISOString()).toBe(new Date(endedAt).toISOString());
  });

  it('stores the figures in every database and reports a failing one after the others', async () => {
    serve({ ...yesterdays, ...executeNew, ...newCompletes, ...pagesOf('01NEW', rows) });
    const broken = {
      insert: () => {
        throw new Error('connection refused');
      },
    } as unknown as Database;

    await expect(refresh(scheduled, [broken, testDatabase])).rejects.toThrow(
      'Storing the stats failed for 1 of 2 databases',
    );
    expect(await storedRows()).toHaveLength(1);
    expect(log).toHaveBeenCalledWith('Stored the stats of execution 01NEW in database 2 of 2');
  });

  it('reuses an execution Dune already ran today after the refresh time, without executing', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        {
          state: 'QUERY_STATE_COMPLETED',
          execution_id: '01TODAY',
          execution_started_at: startedAt,
        },
      ],
      ...pagesOf('01TODAY', rows),
    });

    await refresh();

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01TODAY']);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('replaces the row of an execution it computes again, keeping one row per execution', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        {
          state: 'QUERY_STATE_COMPLETED',
          execution_id: '01TODAY',
          execution_started_at: startedAt,
        },
      ],
      ...pagesOf('01TODAY', rows),
    });
    await refresh();
    const [first] = await storedRows();
    await refresh();
    const stored = await storedRows();
    expect(stored).toHaveLength(1);
    expect(stored[0].stats).toEqual(first.stats);
    expect(new Date(stored[0].computedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(first.computedAt).getTime(),
    );
  });

  it('waits for an execution Dune is already running and uses it once it completes', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        {
          state: 'QUERY_STATE_EXECUTING',
          execution_id: '01RUNNING',
          execution_started_at: startedAt,
        },
      ],
      'GET execution/01RUNNING/status': [
        { execution_id: '01RUNNING', state: 'QUERY_STATE_EXECUTING' },
        { execution_id: '01RUNNING', state: 'QUERY_STATE_COMPLETED' },
      ],
      ...pagesOf('01RUNNING', rows),
    });

    await refresh();

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01RUNNING']);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('executes afresh when the execution it waited for fails', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        {
          state: 'QUERY_STATE_PENDING',
          execution_id: '01RUNNING',
          execution_started_at: startedAt,
        },
      ],
      'GET execution/01RUNNING/status': [
        { execution_id: '01RUNNING', state: 'QUERY_STATE_FAILED' },
      ],
      ...executeNew,
      ...newCompletes,
      ...pagesOf('01NEW', rows),
    });

    await refresh();

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01NEW']);
    expect(log).toHaveBeenCalledWith(
      'Dune execution 01RUNNING ended with state QUERY_STATE_FAILED; executing',
    );
  });

  it('lets an early execution finish, then runs the scheduled refresh', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        {
          state: 'QUERY_STATE_EXECUTING',
          execution_id: '01EARLY',
          execution_started_at: '2026-09-18T05:20:00Z',
        },
      ],
      'GET execution/01EARLY/status': [
        { execution_id: '01EARLY', state: 'QUERY_STATE_EXECUTING' },
        { execution_id: '01EARLY', state: 'QUERY_STATE_COMPLETED' },
      ],
      ...executeNew,
      ...newCompletes,
      ...pagesOf('01NEW', rows),
    });

    await refresh();

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01NEW']);
    const order = fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);
    const lastEarlyPoll = order.findLastIndex((c) => c.includes('01EARLY/status'));
    const execute = order.findIndex((c) => c.startsWith('POST'));
    expect(lastEarlyPoll).toBeGreaterThanOrEqual(0);
    expect(execute).toBeGreaterThan(lastEarlyPoll);
  });

  it('uses an early-queued execution after all when Dune started it after the refresh time', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        {
          state: 'QUERY_STATE_PENDING',
          execution_id: '01QUEUED',
          submitted_at: '2026-09-18T05:20:00Z',
        },
      ],
      'GET execution/01QUEUED/status': [
        { execution_id: '01QUEUED', state: 'QUERY_STATE_PENDING' },
        {
          execution_id: '01QUEUED',
          state: 'QUERY_STATE_COMPLETED',
          execution_started_at: '2026-09-18T05:35:00.000000Z',
          execution_ended_at: '2026-09-18T05:35:20.000000Z',
        },
      ],
      ...pagesOf('01QUEUED', rows, {
        execution_started_at: '2026-09-18T05:35:00.000000Z',
        execution_ended_at: '2026-09-18T05:35:20.000000Z',
      }),
    });

    await refresh();

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01QUEUED']);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('after the refresh time; using it'));
  });

  it('still refreshes after an early execution that also started before the refresh time', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        {
          state: 'QUERY_STATE_PENDING',
          execution_id: '01QUEUED',
          submitted_at: '2026-09-18T05:20:00Z',
        },
      ],
      'GET execution/01QUEUED/status': [
        {
          execution_id: '01QUEUED',
          state: 'QUERY_STATE_COMPLETED',
          execution_started_at: '2026-09-18T05:25:00.000000Z',
        },
      ],
      ...executeNew,
      'GET execution/01NEW/status': [status('QUERY_STATE_COMPLETED')],
      ...pagesOf('01NEW', rows),
    });

    await refresh();

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01NEW']);
  });

  it('runs the scheduled refresh even if the early execution never finishes', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        {
          state: 'QUERY_STATE_EXECUTING',
          execution_id: '01EARLY',
          execution_started_at: '2026-09-18T05:20:00Z',
        },
      ],
      'GET execution/01EARLY/status': [{ execution_id: '01EARLY', state: 'QUERY_STATE_EXECUTING' }],
      ...executeNew,
      'GET execution/01NEW/status': [status('QUERY_STATE_COMPLETED')],
      ...pagesOf('01NEW', rows),
    });

    await refresh(scheduled, [testDatabase], { waitTimeoutMs: 0 });

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01NEW']);
    expect(log).toHaveBeenCalledWith('Timed out waiting for Dune execution 01EARLY; executing');
  });

  it('replaces an execution it waited for that never finishes', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [
        { state: 'QUERY_STATE_PENDING', execution_id: '01STUCK', execution_started_at: startedAt },
      ],
      'GET execution/01STUCK/status': [{ execution_id: '01STUCK', state: 'QUERY_STATE_PENDING' }],
      ...executeNew,
      'GET execution/01NEW/status': [status('QUERY_STATE_COMPLETED')],
      ...pagesOf('01NEW', rows),
    });

    await refresh(manual, [testDatabase], { waitTimeoutMs: 0 });

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01NEW']);
  });

  it('fails without storing anything when its own execution never finishes', async () => {
    serve({
      ...yesterdays,
      ...executeNew,
      'GET execution/01NEW/status': [status('QUERY_STATE_EXECUTING')],
    });
    await expect(refresh(scheduled, [testDatabase], { waitTimeoutMs: 0 })).rejects.toThrow(
      'Timed out waiting for Dune execution 01NEW',
    );
    expect(await storedRows()).toHaveLength(0);
  });

  it('judges the new execution against the time after waiting, not the time the run started', async () => {
    // Planning happened at 05:40; the early execution took until 05:51 and
    // the replacement ran at 05:52, well beyond the clock skew allowed
    // against the start time.
    const times = ['2026-09-18T05:40:00Z', '2026-09-18T05:52:30Z'].map((t) => new Date(t));
    let reads = 0;
    const clock = () => times[Math.min(reads++, times.length - 1)];
    const lateStart = '2026-09-18T05:52:00.000000Z';
    const lateEnd = '2026-09-18T05:52:20.000000Z';
    serve({
      ...yesterdays,
      ...executeNew,
      'GET execution/01NEW/status': [status('QUERY_STATE_COMPLETED')],
      ...pagesOf('01NEW', rows, { execution_started_at: lateStart, execution_ended_at: lateEnd }),
    });

    const stats = await refresh(scheduled, [testDatabase], { clock });

    expect(stats.updatedAt).toBe(lateEnd);
    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01NEW']);
  });

  it('stores what the chain says has been settled, read once per run', async () => {
    serve({ ...yesterdays, ...executeNew, ...newCompletes, ...pagesOf('01NEW', rows) });
    const settled = {
      celo: 1_234_567.5,
      transfers: 2,
      lastTransferAt: '2026-09-15T10:00:00.000Z',
      throughBlock: 77_000_000,
    };
    const readSettled = vi.fn(async () => settled);

    const stats = await refreshBuybackStats({
      apiKey: 'k',
      databases: [testDatabase],
      log,
      pollIntervalMs: 0,
      clock: () => now,
      readSettled,
      ...scheduled,
    });

    expect(readSettled).toHaveBeenCalledTimes(1);
    expect(stats.settled).toEqual(settled);
    const [stored] = await storedRows();
    expect(stored.stats.settled).toEqual(settled);
    expect(log).toHaveBeenCalledWith(
      'Settled on chain: 1234567.50 CELO in 2 transfers through block 77000000',
    );
  });

  it('stores no settled figure, and says so, when no node is configured', async () => {
    serve({ ...yesterdays, ...executeNew, ...newCompletes, ...pagesOf('01NEW', rows) });
    const stats = await refresh();
    expect(stats.settled).toBeNull();
    expect(log).toHaveBeenCalledWith('On-chain transfers not read (no node configured)');
  });

  it('fails without storing anything when the node cannot be read', async () => {
    serve({ ...yesterdays, ...executeNew, ...newCompletes, ...pagesOf('01NEW', rows) });
    await expect(
      refreshBuybackStats({
        apiKey: 'k',
        databases: [testDatabase],
        log,
        pollIntervalMs: 0,
        clock: () => now,
        readSettled: async () => {
          throw new Error('504 Gateway Time-out');
        },
        ...scheduled,
      }),
    ).rejects.toThrow('504');
    expect(await storedRows()).toHaveLength(0);
  });

  it('executes when the latest execution cannot be read', async () => {
    serve({
      'GET query/6898547/results?limit=1&offset=0': [new Response('down', { status: 503 })],
      ...executeNew,
      ...newCompletes,
      ...pagesOf('01NEW', rows),
    });

    await refresh();

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01NEW']);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Could not read the latest execution'),
    );
  });

  it('fails without storing anything when Dune refuses to execute', async () => {
    serve({
      ...yesterdays,
      'POST query/6898547/execute': [
        new Response('{"error":"would exceed your configured datapoint limit"}', { status: 402 }),
      ],
    });

    const error = await refresh().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DuneRequestError);
    expect((error as Error).message).toContain('datapoint limit');
    expect(await storedRows()).toHaveLength(0);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('fails without storing anything when the execution does not complete', async () => {
    serve({
      ...yesterdays,
      ...executeNew,
      'GET execution/01NEW/status': [status('QUERY_STATE_FAILED')],
    });
    await expect(refresh()).rejects.toThrow(
      'Dune execution 01NEW ended with state QUERY_STATE_FAILED',
    );
    expect(await storedRows()).toHaveLength(0);
  });

  it('keeps the previous figures when the new results do not pass validation', async () => {
    serve({ ...yesterdays, ...executeNew, ...newCompletes, ...pagesOf('01NEW', rows) });
    await refresh();

    // On the second page, so the first page's rows have already been accepted.
    const broken = rows.map((row, i) => (i === 100 ? { ...row, fee_CELO: 'n/a' } : row));
    serve({
      ...yesterdays,
      'POST query/6898547/execute': [{ execution_id: '01BAD', state: 'QUERY_STATE_PENDING' }],
      'GET execution/01BAD/status': [{ execution_id: '01BAD', state: 'QUERY_STATE_COMPLETED' }],
      ...pagesOf('01BAD', broken as DuneFeeRow[]),
    });
    await expect(refresh()).rejects.toThrow('malformed row (0.fee_CELO:');

    expect((await storedRows()).map((r) => r.executionId)).toEqual(['01NEW']);
  });

  it('refuses a history that stops short of the window, so a broken query is not stored', async () => {
    const truncated = rows.slice(0, 100);
    serve({ ...yesterdays, ...executeNew, ...newCompletes, ...pagesOf('01NEW', truncated) });
    await expect(refresh()).rejects.toThrow('Dune history has no row for');
    expect(await storedRows()).toHaveLength(0);
  });
});
