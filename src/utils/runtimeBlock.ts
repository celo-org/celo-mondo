export default function getRuntimeBlock(): { blockNumber: bigint } | { blockTag: 'latest' } {
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_FORK_BLOCK_NUMBER) {
    return { blockNumber: BigInt(process.env.NEXT_PUBLIC_FORK_BLOCK_NUMBER) };
  }
  return { blockTag: 'latest' };
}
