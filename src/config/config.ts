import { celo, celoAlfajores, Chain } from 'viem/chains';

interface Config {
  debug: boolean;
  version: string | null;
  appName: string;
  walletConnectProjectId: string;
  fornoApiKey: string;
  celoscanApiKey: string;
  infuraApiKey: string;
  upstashKey: string;
  watchBlockNumber: boolean;
  chain: Chain;
}

const isDevMode = process?.env?.NODE_ENV === 'development';
const version = process?.env?.NEXT_PUBLIC_VERSION ?? null;
const walletConnectProjectId = process?.env?.NEXT_PUBLIC_WALLET_CONNECT_ID || '';
const fornoApiKey = process?.env?.NEXT_PUBLIC_FORNO_API_KEY || '';
const celoscanApiKey = process?.env?.NEXT_PUBLIC_CELOSCAN_API_KEY || '';
const infuraApiKey = process?.env?.NEXT_PUBLIC_INFURA_API_KEY || '';
const upstashKey = process?.env?.UPSTASH_KEY || '';

export const fornoRpcUrl = `https://forno.celo.org?apikey=${fornoApiKey}`;
export const infuraRpcUrl = `https://celo-mainnet.infura.io/v3/${infuraApiKey}`;

const rpcUrl = process?.env?.NEXT_PUBLIC_RPC_URL || celo.rpcUrls.default.http[0];

const isMainnet = ['mainnet', celo.rpcUrls.default.http[0]].includes(rpcUrl);
const isKnownNetwork = [
  'mainnet',
  celo.rpcUrls.default.http[0],
  'testnet',
  'alfajores',
  celoAlfajores.rpcUrls.default.http[0],
].includes(rpcUrl);

const chain = {
  ...(isMainnet ? celo : celoAlfajores),
  ...(isKnownNetwork
    ? {}
    : {
        rpcUrls: {
          default: {
            http: [rpcUrl],
          },
        },
        testnet: true,
      }),
} as Chain;

export const config: Config = Object.freeze({
  debug: isDevMode,
  version,
  appName: 'Celo Mondo',
  chain,
  walletConnectProjectId,
  fornoApiKey,
  celoscanApiKey,
  infuraApiKey,
  upstashKey,
  watchBlockNumber: false,
});
