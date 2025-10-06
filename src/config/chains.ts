export enum ChainId {
  Alfajores = 44787,
  Baklava = 62320,
  Celo = 42220,
}

export interface ChainMetadata {
  chainId: ChainId;
  name: string;
  explorerUrl: string;
  explorerApiUrl: string;
}

export const Celo: ChainMetadata = {
  chainId: ChainId.Celo,
  name: 'Celo',
  explorerUrl: 'https://celo.blockscout.com',
  explorerApiUrl: 'https://celo.blockscout.com/api',
};

export const chainIdToChain: Record<number, ChainMetadata> = {
  [ChainId.Celo]: Celo,
};
