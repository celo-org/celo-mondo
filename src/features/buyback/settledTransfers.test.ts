// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { CELO_TOKEN, COMMUNITY_FUND, OPERATIONS_SAFE } from './addresses';
import { SETTLEMENT_SCAN_FROM_BLOCK, readSettledTransfers } from './settledTransfers';

type LogsCall = { fromBlock: bigint; toBlock: bigint; address: string; args: unknown };

/** A stand-in for the archive node: logs by block, the head and block times. */
function fakeClient(
  head: bigint,
  logs: Array<{ blockNumber: bigint; value: bigint }>,
  timestamps: Record<string, number> = {},
) {
  const calls: LogsCall[] = [];
  const client = {
    getBlockNumber: vi.fn(async () => head),
    getLogs: vi.fn(async (query: LogsCall) => {
      calls.push(query);
      return logs
        .filter((log) => log.blockNumber >= query.fromBlock && log.blockNumber <= query.toBlock)
        .map((log) => ({ blockNumber: log.blockNumber, args: { value: log.value } }));
    }),
    getBlock: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({
      timestamp: BigInt(timestamps[blockNumber.toString()] ?? 0),
    })),
  };
  return { client: client as never, calls };
}

const CELO = 10n ** 18n;

describe('readSettledTransfers', () => {
  it('scans from the cutoff block to the head in million-block chunks', async () => {
    const { client, calls } = fakeClient(65_500_000n, []);
    const settled = await readSettledTransfers(client);
    expect(calls.map((c) => [c.fromBlock, c.toBlock])).toEqual([
      [63_792_042n, 64_792_041n],
      [64_792_042n, 65_500_000n],
    ]);
    expect(settled).toEqual({
      celo: 0,
      transfers: 0,
      lastTransferAt: null,
      throughBlock: 65_500_000,
    });
  });

  it('asks only for CELO transfers from the Operations Safe to the Community Fund', async () => {
    const { client, calls } = fakeClient(SETTLEMENT_SCAN_FROM_BLOCK + 10n, []);
    await readSettledTransfers(client);
    expect(calls).toHaveLength(1);
    expect(calls[0].address).toBe(CELO_TOKEN);
    expect(calls[0].args).toEqual({ from: OPERATIONS_SAFE, to: COMMUNITY_FUND });
  });

  it('sums the transfers across chunks and dates the last one', async () => {
    const { client } = fakeClient(
      66_000_000n,
      [
        { blockNumber: 64_000_000n, value: 1_500_000n * CELO },
        { blockNumber: 65_000_000n, value: 250_000n * CELO + CELO / 2n },
      ],
      { '65000000': 1_790_000_000 },
    );
    const settled = await readSettledTransfers(client);
    expect(settled.celo).toBeCloseTo(1_750_000.5, 6);
    expect(settled.transfers).toBe(2);
    expect(settled.lastTransferAt).toBe(new Date(1_790_000_000 * 1000).toISOString());
    expect(settled.throughBlock).toBe(66_000_000);
  });

  it('scans up to a given block instead of the head', async () => {
    const { client, calls } = fakeClient(70_000_000n, [
      { blockNumber: 64_000_000n, value: CELO },
      { blockNumber: 69_000_000n, value: CELO },
    ]);
    const settled = await readSettledTransfers(client, { toBlock: 64_500_000n });
    expect(calls).toHaveLength(1);
    expect(settled.transfers).toBe(1);
    expect(settled.throughBlock).toBe(64_500_000);
  });

  it('surfaces a node failure instead of reporting zero transfers', async () => {
    const { client } = fakeClient(65_000_000n, []);
    (client as { getLogs: ReturnType<typeof vi.fn> }).getLogs.mockRejectedValueOnce(
      new Error('504 Gateway Time-out'),
    );
    await expect(readSettledTransfers(client)).rejects.toThrow('504');
  });
});
