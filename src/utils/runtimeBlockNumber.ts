export default function getRuntimeBlockNumber() {
  if (process.env.NODE_ENV !== 'production') {
    return process.env.NEXT_PUBLIC_FORK_BLOCK_NUMBER
      ? BigInt(process.env.NEXT_PUBLIC_FORK_BLOCK_NUMBER)
      : undefined;
  }
  return undefined;
}
