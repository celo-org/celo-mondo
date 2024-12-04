import { createTestClient, createWalletClient, http, publicActions, type Chain } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import { ANVIL_BASE_HOST, ANVIL_CHAIN_ID, TEST_MNEMONIC } from './constants';

/**
 * The id of the current test worker.
 *
 * This is used by the anvil proxy to route requests to the correct anvil instance.
 */
export const pool = Number(process.env.VITEST_POOL_ID ?? 1);
export const anvil = {
  ...celoAlfajores,
  id: ANVIL_CHAIN_ID,
  rpcUrls: {
    default: {
      http: [`http://${ANVIL_BASE_HOST}/${pool}`],
      webSocket: [`ws://${ANVIL_BASE_HOST}/${pool}`],
    },
    public: {
      http: [`http://${ANVIL_BASE_HOST}/${pool}`],
      webSocket: [`ws://${ANVIL_BASE_HOST}/${pool}`],
    },
  },
} as const satisfies Chain;

export const testClient = createTestClient({
  chain: anvil,
  mode: 'anvil',
  transport: http(),
}).extend(publicActions);

export const walletClient = createWalletClient({
  chain: anvil,
  account: mnemonicToAccount(TEST_MNEMONIC),
  transport: http(),
});
