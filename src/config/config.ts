import { assert } from 'src/utils/validation';
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

const mainnetUrl = celo.rpcUrls.default.http[0];
const alfajoresUrl = celoAlfajores.rpcUrls.default.http[0];
const rpcUrl = process?.env?.NEXT_PUBLIC_RPC_URL || mainnetUrl;

// We assume using a custom RPC url will be mainnet (archive node, local node, ...)
const isMainnet = ['mainnet', mainnetUrl, process.env.NEXT_PUBLIC_RPC_URL].includes(rpcUrl);
const isAlfajores = ['alfajores', alfajoresUrl].includes(rpcUrl);
const isKnownNetwork = isMainnet || isAlfajores;

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

// NOTE: override the viem chain's rpc url in case we use an env variable
chain.rpcUrls.default.http = [rpcUrl];

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

if (process.env.NODE_ENV === 'production') {
  const mandatoryConfig = [
    'celoscanApiKey',
    'walletConnectProjectId',
    'fornoApiKey',
    'infuraApiKey',
  ] as (keyof typeof config)[];

  for (const key of mandatoryConfig) {
    assert(config[key], `${key} must be set in production environments.`);
  }
}
