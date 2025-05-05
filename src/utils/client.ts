import { config, fornoRpcUrl } from 'src/config/config';
import { Account, createPublicClient, createWalletClient, http } from 'viem';

export const createCeloPublicClient = () =>
  createPublicClient({
    chain: config.chain,
    transport: config.chain.testnet ? http() : http(fornoRpcUrl),
    batch: {
      multicall: true,
    },
  });

export const createCeloWalletClient = (account: Account) =>
  createWalletClient({
    account,
    chain: config.chain,
    transport: config.chain.testnet ? http() : http(fornoRpcUrl),
  });
