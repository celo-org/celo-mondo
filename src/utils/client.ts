import { config, fornoRpcUrl } from 'src/config/config';
import { Account, createPublicClient, createWalletClient, http } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';

export const createCeloPublicClient = () =>
  createPublicClient({
    chain: config.isAlfajores ? celoAlfajores : celo,
    transport: config.isAlfajores ? http() : http(fornoRpcUrl),
  });

export const createCeloWalletClient = (account: Account) =>
  createWalletClient({
    account,
    chain: config.isAlfajores ? celoAlfajores : celo,
    transport: config.isAlfajores ? http() : http(fornoRpcUrl),
  });
