// @vitest-environment node
import { Hex } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { CELO_TOKEN, COMMUNITY_FUND, OPERATIONS_SAFE } from './addresses';
import {
  SETTLEMENT_SCAN_FROM_BLOCK,
  nativeValueTo,
  readSettledTransfers,
} from './settledTransfers';

type LogsCall = { fromBlock: bigint; toBlock: bigint; address: string; args?: unknown };
type TraceCall = { method: string; params: [string, { tracer: string }] };
/** A frame of a call trace, as the node returns it. */
type Frame = { type: string; to?: Hex; value?: Hex; error?: string; calls?: Frame[] };

const CELO = 10n ** 18n;
const GOV = COMMUNITY_FUND.toLowerCase() as Hex;
const hex = (value: bigint): Hex => `0x${value.toString(16)}`;

/** A Safe execution whose trace the fake node will serve. */
interface Execution {
  blockNumber: bigint;
  hash: string;
  trace: Frame;
}

/** A stand-in for the archive node: token transfers, Safe executions, traces, the head and block times. */
function fakeClient(
  head: bigint,
  {
    transfers = [],
    executions = [],
    timestamps = {},
  }: {
    transfers?: Array<{ blockNumber: bigint; value: bigint }>;
    executions?: Execution[];
    timestamps?: Record<string, number>;
  } = {},
) {
  const calls: LogsCall[] = [];
  const traces: TraceCall[] = [];
  const client = {
    getBlockNumber: vi.fn(async () => head),
    getLogs: vi.fn(async (query: LogsCall) => {
      calls.push(query);
      const inRange = (blockNumber: bigint) =>
        blockNumber >= query.fromBlock && blockNumber <= query.toBlock;
      if (query.address === CELO_TOKEN) {
        return transfers
          .filter((log) => inRange(log.blockNumber))
          .map((log) => ({ blockNumber: log.blockNumber, args: { value: log.value } }));
      }
      if (query.address === OPERATIONS_SAFE) {
        return executions
          .filter((e) => inRange(e.blockNumber))
          .map((e) => ({ blockNumber: e.blockNumber, transactionHash: e.hash }));
      }
      throw new Error(`unexpected log query for ${query.address}`);
    }),
    request: vi.fn(async (call: TraceCall) => {
      traces.push(call);
      const execution = executions.find((e) => e.hash === call.params[0]);
      if (!execution) throw new Error(`no trace for ${call.params[0]}`);
      return execution.trace;
    }),
    getBlock: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({
      timestamp: BigInt(timestamps[blockNumber.toString()] ?? 0),
    })),
  };
  return { client: client as never, calls, traces };
}

/** The trace of a batch sent as plain value: the Safe calls Governance, whose proxy delegates on. */
const nativeBatch = (value: bigint): Frame => ({
  type: 'CALL',
  to: OPERATIONS_SAFE,
  value: '0x0',
  calls: [
    {
      type: 'CALL',
      to: COMMUNITY_FUND,
      value: hex(value),
      calls: [
        {
          type: 'DELEGATECALL',
          to: '0x40cac0be7e25b14e39f782d5b7e5c3076aa6c57a',
          value: hex(value),
        },
      ],
    },
  ],
});

/** The trace of a batch sent through the token contract: no value moves in the trace. */
const tokenBatch: Frame = {
  type: 'CALL',
  to: OPERATIONS_SAFE,
  value: '0x0',
  calls: [{ type: 'CALL', to: CELO_TOKEN, value: '0x0' }],
};

describe('nativeValueTo', () => {
  it('sums the value calls to the recipient, whatever the case of the address', () => {
    expect(nativeValueTo(nativeBatch(5n * CELO), GOV)).toBe(5n * CELO);
    expect(nativeValueTo(nativeBatch(5n * CELO), COMMUNITY_FUND)).toBe(5n * CELO);
  });

  it('counts the proxy delegation once, not twice', () => {
    const frame = nativeBatch(5n * CELO);
    expect(frame.calls![0].calls![0].type).toBe('DELEGATECALL');
    expect(nativeValueTo(frame, GOV)).toBe(5n * CELO);
  });

  it('finds value calls nested in a batch of calls, as a MultiSend makes them', () => {
    const frame: Frame = {
      type: 'CALL',
      to: OPERATIONS_SAFE,
      calls: [
        {
          type: 'DELEGATECALL',
          to: '0x40a2accbd92bca938b02010e17a5b8929b49130d',
          calls: [
            { type: 'CALL', to: '0x6b145ebf66602ec524b196426b46631259689583', value: hex(CELO) },
            { type: 'CALL', to: GOV, value: hex(3n * CELO) },
            { type: 'CALL', to: COMMUNITY_FUND, value: hex(4n * CELO) },
          ],
        },
      ],
    };
    expect(nativeValueTo(frame, GOV)).toBe(7n * CELO);
  });

  it('ignores calls to others, calls without value and calls that reverted', () => {
    expect(nativeValueTo(tokenBatch, GOV)).toBe(0n);
    const reverted: Frame = {
      type: 'CALL',
      to: GOV,
      value: hex(CELO),
      error: 'execution reverted',
    };
    expect(nativeValueTo(reverted, GOV)).toBe(0n);
    expect(nativeValueTo({ type: 'CALL', to: GOV }, GOV)).toBe(0n);
  });

  it('ignores everything beneath a call that reverted, marked or not', () => {
    // A transaction that caught the revert of a batch: the batch's own
    // calls had succeeded before the batch reverted, so the trace does not
    // mark them, but they were rolled back with it.
    const caught: Frame = {
      type: 'CALL',
      to: OPERATIONS_SAFE,
      calls: [
        {
          type: 'CALL',
          to: '0x40a2accbd92bca938b02010e17a5b8929b49130d',
          error: 'execution reverted',
          calls: [
            { type: 'CALL', to: GOV, value: hex(3n * CELO) },
            { type: 'CALL', to: GOV, value: hex(4n * CELO), error: 'out of gas' },
          ],
        },
        { type: 'CALL', to: GOV, value: hex(CELO) },
      ],
    };
    expect(nativeValueTo(caught, GOV)).toBe(CELO);
  });
});

describe('readSettledTransfers', () => {
  it('scans from the cutoff block to the head in million-block chunks', async () => {
    const { client, calls } = fakeClient(65_500_000n);
    const settled = await readSettledTransfers(client);
    const ranges = calls.map((c) => `${c.fromBlock}-${c.toBlock}`);
    expect(new Set(ranges)).toEqual(new Set(['63792042-64792041', '64792042-65500000']));
    expect(settled).toEqual({
      celo: 0,
      transfers: 0,
      lastTransferAt: null,
      throughBlock: 65_500_000,
    });
  });

  it('asks for CELO token transfers from the Safe to the Community Fund and for Safe executions', async () => {
    const { client, calls, traces } = fakeClient(SETTLEMENT_SCAN_FROM_BLOCK + 10n);
    await readSettledTransfers(client);
    expect(calls).toHaveLength(2);
    const token = calls.find((c) => c.address === CELO_TOKEN)!;
    expect(token.args).toEqual({ from: OPERATIONS_SAFE, to: COMMUNITY_FUND });
    expect(calls.find((c) => c.address === OPERATIONS_SAFE)).toBeDefined();
    expect(traces).toHaveLength(0);
  });

  it('sums token transfers and value sent in Safe transactions, and dates the last one', async () => {
    const { client, traces } = fakeClient(66_000_000n, {
      transfers: [
        { blockNumber: 64_000_000n, value: 1_500_000n * CELO },
        { blockNumber: 65_000_000n, value: 250_000n * CELO + CELO / 2n },
      ],
      executions: [
        // A batch sent through the token contract: counted by its Transfer event only.
        { blockNumber: 64_000_000n, hash: '0xa', trace: tokenBatch },
        // A batch sent as plain value: counted from the trace.
        { blockNumber: 65_500_000n, hash: '0xb', trace: nativeBatch(700_000n * CELO) },
        // A Safe transaction that moved CELO elsewhere.
        {
          blockNumber: 65_600_000n,
          hash: '0xc',
          trace: {
            type: 'CALL',
            to: OPERATIONS_SAFE,
            calls: [
              { type: 'CALL', to: '0x6b145ebf66602ec524b196426b46631259689583', value: hex(CELO) },
            ],
          },
        },
      ],
      timestamps: { '65500000': 1_790_000_000 },
    });
    const settled = await readSettledTransfers(client);
    expect(settled.celo).toBeCloseTo(2_450_000.5, 6);
    expect(settled.transfers).toBe(3);
    expect(settled.lastTransferAt).toBe(new Date(1_790_000_000 * 1000).toISOString());
    expect(settled.throughBlock).toBe(66_000_000);
    expect(traces.map((t) => [t.method, t.params[0], t.params[1].tracer])).toEqual([
      ['debug_traceTransaction', '0xa', 'callTracer'],
      ['debug_traceTransaction', '0xb', 'callTracer'],
      ['debug_traceTransaction', '0xc', 'callTracer'],
    ]);
  });

  it('dates the last transfer by block, whichever path it took', async () => {
    const { client } = fakeClient(66_000_000n, {
      transfers: [{ blockNumber: 65_900_000n, value: CELO }],
      executions: [{ blockNumber: 65_500_000n, hash: '0xb', trace: nativeBatch(CELO) }],
      timestamps: { '65900000': 1_791_000_000, '65500000': 1_790_000_000 },
    });
    const settled = await readSettledTransfers(client);
    expect(settled.lastTransferAt).toBe(new Date(1_791_000_000 * 1000).toISOString());
  });

  it('traces each Safe transaction once', async () => {
    const { client, traces } = fakeClient(66_000_000n, {
      executions: [
        { blockNumber: 65_500_000n, hash: '0xb', trace: nativeBatch(CELO) },
        { blockNumber: 65_500_000n, hash: '0xb', trace: nativeBatch(CELO) },
      ],
    });
    const settled = await readSettledTransfers(client);
    expect(traces).toHaveLength(1);
    expect(settled.transfers).toBe(1);
  });

  it('scans up to a given block instead of the head', async () => {
    const { client, calls } = fakeClient(70_000_000n, {
      transfers: [
        { blockNumber: 64_000_000n, value: CELO },
        { blockNumber: 69_000_000n, value: CELO },
      ],
    });
    const settled = await readSettledTransfers(client, { toBlock: 64_500_000n });
    expect(calls).toHaveLength(2);
    expect(settled.transfers).toBe(1);
    expect(settled.throughBlock).toBe(64_500_000);
  });

  it('surfaces a node failure instead of reporting fewer transfers', async () => {
    const { client } = fakeClient(65_000_000n);
    (client as { getLogs: ReturnType<typeof vi.fn> }).getLogs.mockRejectedValueOnce(
      new Error('504 Gateway Time-out'),
    );
    await expect(readSettledTransfers(client)).rejects.toThrow('504');

    const traced = fakeClient(65_000_000n, {
      executions: [{ blockNumber: 64_000_000n, hash: '0xb', trace: nativeBatch(CELO) }],
    });
    (traced.client as { request: ReturnType<typeof vi.fn> }).request.mockRejectedValueOnce(
      new Error('the method debug_traceTransaction does not exist/is not available'),
    );
    await expect(readSettledTransfers(traced.client)).rejects.toThrow('debug_traceTransaction');
  });
});
