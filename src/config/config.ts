interface Config {
  debug: boolean;
  version: string | null;
  walletConnectProjectId: string;
  fornoApiKey: string;
  celoscanApiKey: string;
}

const isDevMode = process?.env?.NODE_ENV === 'development';
const version = process?.env?.NEXT_PUBLIC_VERSION ?? null;
const walletConnectProjectId = process?.env?.NEXT_PUBLIC_WALLET_CONNECT_ID || '';
const fornoApiKey = process?.env?.NEXT_PUBLIC_FORNO_API_KEY || '';
const celoscanApiKey = process?.env?.NEXT_PUBLIC_CELOSCAN_API_KEY || '';

export const config: Config = Object.freeze({
  debug: isDevMode,
  version,
  walletConnectProjectId,
  fornoApiKey,
  celoscanApiKey,
});
