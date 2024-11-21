import { ChainId } from 'src/config/chains';

interface Config {
  debug: boolean;
  version: string | null;
  appName: string;
  chainId: number;
  walletConnectProjectId: string;
  fornoApiKey: string;
  celoscanApiKey: string;
  infuraApiKey: string;
  upstashKey: string;
  watchBlockNumber: boolean;
  useAlfajores: boolean;
}

const isDevMode = process?.env?.NODE_ENV === 'development';
const version = process?.env?.NEXT_PUBLIC_VERSION ?? null;
const walletConnectProjectId = process?.env?.NEXT_PUBLIC_WALLET_CONNECT_ID || '';
const fornoApiKey = process?.env?.NEXT_PUBLIC_FORNO_API_KEY || '';
const celoscanApiKey = process?.env?.NEXT_PUBLIC_CELOSCAN_API_KEY || '';
const infuraApiKey = process?.env?.NEXT_PUBLIC_INFURA_API_KEY || '';
const upstashKey = process?.env?.UPSTASH_KEY || '';
const useAlfajores = process?.env?.NEXT_PUBLIC_USE_ALFAJORES === '1' || false;

export const fornoRpcUrl = `https://forno.celo.org?apikey=${fornoApiKey}`;
export const infuraRpcUrl = `https://celo-mainnet.infura.io/v3/${infuraApiKey}`;

export const config: Config = Object.freeze({
  debug: isDevMode,
  version,
  appName: 'Celo Mondo',
  chainId: useAlfajores ? ChainId.Alfajores : ChainId.Celo,
  walletConnectProjectId,
  fornoApiKey,
  celoscanApiKey,
  infuraApiKey,
  upstashKey,
  watchBlockNumber: false,
  useAlfajores,
});
