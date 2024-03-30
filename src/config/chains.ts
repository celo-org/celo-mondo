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

export const Alfajores: ChainMetadata = {
  chainId: ChainId.Alfajores,
  name: 'Alfajores',
  explorerUrl: 'https://alfajores.celoscan.io',
  explorerApiUrl: 'https://api-alfajores.celoscan.io/api',
};

export const Baklava: ChainMetadata = {
  chainId: ChainId.Baklava,
  name: 'Baklava',
  explorerUrl: 'https://explorer.celo.org/baklava',
  explorerApiUrl: 'https://explorer.celo.org/baklava/api',
};

export const Celo: ChainMetadata = {
  chainId: ChainId.Celo,
  name: 'Celo',
  explorerUrl: 'https://celoscan.io',
  explorerApiUrl: 'https://api.celoscan.io/api',
};

export const chainIdToChain: Record<number, ChainMetadata> = {
  [ChainId.Alfajores]: Alfajores,
  [ChainId.Baklava]: Baklava,
  [ChainId.Celo]: Celo,
};
