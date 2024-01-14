interface Config {
  debug: boolean;
  version: string | null;
  appName: string;
  walletConnectProjectId: string;
  fornoApiKey: string;
  celoscanApiKey: string;
  infuraApiKey: string;
  watchBlockNumber: boolean;
}

const isDevMode = process?.env?.NODE_ENV === 'development';
const version = process?.env?.NEXT_PUBLIC_VERSION ?? null;
const walletConnectProjectId = process?.env?.NEXT_PUBLIC_WALLET_CONNECT_ID || '';
const fornoApiKey = process?.env?.NEXT_PUBLIC_FORNO_API_KEY || '';
const celoscanApiKey = process?.env?.NEXT_PUBLIC_CELOSCAN_API_KEY || '';
const infuraApiKey = process?.env?.NEXT_PUBLIC_INFURA_API_KEY || '';

export const config: Config = Object.freeze({
  debug: isDevMode,
  version,
  appName: 'Celo Station',
  walletConnectProjectId,
  fornoApiKey,
  celoscanApiKey,
  infuraApiKey,
  watchBlockNumber: !isDevMode,
});
