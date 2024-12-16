import { createPublicClient, createTestClient, createWalletClient, http, PublicClient } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { ANVIL_BASE_HOST, ANVIL_FORK_URL, TEST_MNEMONIC } from './constants';

/**
 * The id of the current test worker.
 *
 * This is used by the anvil proxy to route requests to the correct anvil instance.
 */
export const pool = Number(process.env.VITEST_POOL_ID ?? 1);
export const anvil = {
  ...celo,
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
} as unknown as typeof celo;

export const testClient = createTestClient({
  chain: anvil,
  mode: 'anvil',
  account: mnemonicToAccount(TEST_MNEMONIC),
  transport: http(),
});

// @ts-expect-error
export const publicClient = createPublicClient({
  chain: anvil,
  // For some reason if we don't set a batch size it fails on anvil?
  batch: { multicall: { batchSize: 2048 } },
  transport: http(),
}) as PublicClient;

// @ts-expect-error
export const publicArchiveClient = createPublicClient({
  chain: celo,
  transport: http(ANVIL_FORK_URL),
}) as PublicClient;

export const walletClient = createWalletClient({
  chain: anvil,
  account: mnemonicToAccount(TEST_MNEMONIC),
  transport: http(),
});