import { CELO_TOKEN, COMMUNITY_FUND, OPERATIONS_SAFE } from 'src/features/buyback/addresses';
import { SettledTransfers } from 'src/features/buyback/types';
import { Chain, PublicClient, Transport, formatUnits, parseAbiItem } from 'viem';

// First block of 2026-04-09 UTC, the day after the settled-revenue cutoff.
// Earlier revenue went back in one transfer on 2026-04-01 (CGP-234) and is
// not part of the window, so the scan starts after it.
export const SETTLEMENT_SCAN_FROM_BLOCK = 63_792_042n;
// The archive node answers log queries over a million blocks; a whole
// history in one request times out.
const LOG_CHUNK_BLOCKS = 1_000_000n;

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

/**
 * CELO transferred from the Operations Safe to the Community Fund since the
 * cutoff, read from the CELO token's Transfer events in chunks. The scan is
 * stateless and repeated on every refresh, so a reorganised or missed block
 * cannot leave a transfer out for good.
 */
export async function readSettledTransfers(
  client: PublicClient<Transport, Chain>,
  {
    fromBlock = SETTLEMENT_SCAN_FROM_BLOCK,
    toBlock,
  }: { fromBlock?: bigint; toBlock?: bigint } = {},
): Promise<SettledTransfers> {
  const head = toBlock ?? (await client.getBlockNumber());
  let total = 0n;
  let transfers = 0;
  let last: { blockNumber: bigint } | null = null;
  for (let start = fromBlock; start <= head; start += LOG_CHUNK_BLOCKS) {
    const end = start + LOG_CHUNK_BLOCKS - 1n < head ? start + LOG_CHUNK_BLOCKS - 1n : head;
    const logs = await client.getLogs({
      address: CELO_TOKEN,
      event: TRANSFER_EVENT,
      args: { from: OPERATIONS_SAFE, to: COMMUNITY_FUND },
      fromBlock: start,
      toBlock: end,
    });
    for (const log of logs) {
      total += log.args.value ?? 0n;
      transfers += 1;
      last = { blockNumber: log.blockNumber };
    }
  }
  const lastTransferAt =
    last === null
      ? null
      : new Date(
          Number((await client.getBlock({ blockNumber: last.blockNumber })).timestamp) * 1000,
        ).toISOString();
  return {
    celo: Number(formatUnits(total, 18)),
    transfers,
    lastTransferAt,
    throughBlock: Number(head),
  };
}
