import { config, fornoRpcUrl } from 'src/config/config';
import { Account, createPublicClient, createWalletClient, http } from 'viem';

// Honor a custom NEXT_PUBLIC_RPC_URL (e.g. a local fork) so server-rendered
// data reads the same chain state as the browser's wagmi transport; otherwise
// prefer Forno with the API key
const customRpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const mainnetRpcUrl = customRpcUrl?.startsWith('http') ? customRpcUrl : fornoRpcUrl;

export const celoPublicClient = createPublicClient({
  chain: config.chain,
  transport: config.chain.testnet ? http() : http(mainnetRpcUrl),
  batch: {
    multicall: true,
  },
});

export const createCeloWalletClient = (account: Account) =>
  createWalletClient({
    account,
    chain: config.chain,
    transport: config.chain.testnet ? http() : http(mainnetRpcUrl),
  });
