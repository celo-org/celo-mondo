import { ChainId, chainIdToChain } from 'src/config/chains';

export function getTxExplorerUrl(hash: string, chainId: ChainId = ChainId.Celo) {
  const chain = chainIdToChain[chainId];
  return `${chain.explorerUrl}/tx/${hash}`;
}
