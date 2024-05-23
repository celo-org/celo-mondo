import { ChainId } from 'src/config/chains';
import { links } from 'src/config/links';

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
}

const isDevMode = process?.env?.NODE_ENV === 'development';
const version = process?.env?.NEXT_PUBLIC_VERSION ?? null;
const walletConnectProjectId = process?.env?.NEXT_PUBLIC_WALLET_CONNECT_ID || '';
const fornoApiKey = process?.env?.NEXT_PUBLIC_FORNO_API_KEY || '';
const celoscanApiKey = process?.env?.NEXT_PUBLIC_CELOSCAN_API_KEY || '';
const infuraApiKey = process?.env?.NEXT_PUBLIC_INFURA_API_KEY || '';
const upstashKey = process?.env?.UPSTASH_KEY || '';

export const fornoRpcUrl = `${links.forno}?apikey=${fornoApiKey}`;
export const infuraRpcUrl = `${links.infura}/${infuraApiKey}`;

export const config: Config = Object.freeze({
  debug: isDevMode,
  version,
  appName: 'Celo Station',
  chainId: ChainId.Celo,
  walletConnectProjectId,
  fornoApiKey,
  celoscanApiKey,
  infuraApiKey,
  upstashKey,
  watchBlockNumber: false,
});
