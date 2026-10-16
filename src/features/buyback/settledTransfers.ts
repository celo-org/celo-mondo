import { CELO_TOKEN, COMMUNITY_FUND, OPERATIONS_SAFE } from 'src/features/buyback/addresses';
import { SettledTransfers } from 'src/features/buyback/types';
import { Chain, Hash, Hex, PublicClient, Transport, formatUnits, parseAbiItem } from 'viem';

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
// Emitted by the Safe for every transaction its owners executed.
const EXECUTION_SUCCESS_EVENT = parseAbiItem(
  'event ExecutionSuccess(bytes32 txHash, uint256 payment)',
);

/** One frame of a `debug_traceTransaction` call trace. */
interface CallFrame {
  type: string;
  to?: Hex;
  value?: Hex;
  error?: string;
  calls?: CallFrame[];
}

type TraceTransaction = (args: {
  method: 'debug_traceTransaction';
  params: [Hash, { tracer: 'callTracer' }];
}) => Promise<CallFrame>;

/**
 * CELO moved to the recipient by plain value calls anywhere inside the
 * transaction. Only a CALL frame moves CELO: a DELEGATECALL frame repeats
 * its caller's value (the Governance proxy forwarding to its implementation
 * shows the same amount again), and a frame that reverted moved nothing.
 */
export function nativeValueTo(frame: CallFrame, recipient: string): bigint {
  const own =
    frame.type === 'CALL' &&
    frame.error === undefined &&
    frame.to?.toLowerCase() === recipient.toLowerCase() &&
    frame.value !== undefined
      ? BigInt(frame.value)
      : 0n;
  return (frame.calls ?? []).reduce((sum, call) => sum + nativeValueTo(call, recipient), own);
}

/**
 * CELO transferred from the Operations Safe to the Community Fund since the
 * cutoff, read from the chain in chunks. The operator sends a batch either
 * through the CELO token contract, which emits a Transfer event, or as plain
 * value in the Safe transaction, which emits nothing of its own: those are
 * found by tracing every transaction the Safe executed and summing the value
 * calls that reach the Community Fund. The scan is stateless and repeated on
 * every refresh, so a reorganised or missed block cannot leave a transfer
 * out for good.
 */
export async function readSettledTransfers(
  client: PublicClient<Transport, Chain>,
  {
    fromBlock = SETTLEMENT_SCAN_FROM_BLOCK,
    toBlock,
  }: { fromBlock?: bigint; toBlock?: bigint } = {},
): Promise<SettledTransfers> {
  const head = toBlock ?? (await client.getBlockNumber());
  const found: Array<{ value: bigint; blockNumber: bigint }> = [];
  const traced = new Set<Hash>();
  for (let start = fromBlock; start <= head; start += LOG_CHUNK_BLOCKS) {
    const end = start + LOG_CHUNK_BLOCKS - 1n < head ? start + LOG_CHUNK_BLOCKS - 1n : head;
    const tokenTransfers = await client.getLogs({
      address: CELO_TOKEN,
      event: TRANSFER_EVENT,
      args: { from: OPERATIONS_SAFE, to: COMMUNITY_FUND },
      fromBlock: start,
      toBlock: end,
    });
    for (const log of tokenTransfers) {
      found.push({ value: log.args.value ?? 0n, blockNumber: log.blockNumber });
    }
    const executions = await client.getLogs({
      address: OPERATIONS_SAFE,
      event: EXECUTION_SUCCESS_EVENT,
      fromBlock: start,
      toBlock: end,
    });
    for (const execution of executions) {
      if (traced.has(execution.transactionHash)) continue;
      traced.add(execution.transactionHash);
      const trace = await (client.request as unknown as TraceTransaction)({
        method: 'debug_traceTransaction',
        params: [execution.transactionHash, { tracer: 'callTracer' }],
      });
      const value = nativeValueTo(trace, COMMUNITY_FUND);
      if (value > 0n) found.push({ value, blockNumber: execution.blockNumber });
    }
  }
  const total = found.reduce((sum, transfer) => sum + transfer.value, 0n);
  const lastBlock = found.reduce<bigint | null>(
    (last, transfer) =>
      last === null || transfer.blockNumber > last ? transfer.blockNumber : last,
    null,
  );
  const lastTransferAt =
    lastBlock === null
      ? null
      : new Date(
          Number((await client.getBlock({ blockNumber: lastBlock })).timestamp) * 1000,
        ).toISOString();
  return {
    celo: Number(formatUnits(total, 18)),
    transfers: found.length,
    lastTransferAt,
    throughBlock: Number(head),
  };
}
