import { startProxy } from '@viem/anvil';
import { formatEther } from 'viem';
import { celo } from 'viem/chains';
import { vi } from 'vitest';
import {
  ANVIL_FORK_URL,
  FORK_BLOCK_NUMBER,
  TEST_BALANCE,
  TEST_GAS_LIMIT,
  TEST_GAS_PRICE,
  TEST_MNEMONIC,
} from './anvil/constants';

export default async function setup() {
  await startProxy({
    port: 8545,
    host: '::', // By default, the proxy will listen on all interfaces.
    options: {
      chainId: celo.id,
      mnemonic: TEST_MNEMONIC,
      balance: BigInt(formatEther(TEST_BALANCE)),
      gasPrice: TEST_GAS_PRICE,
      gasLimit: TEST_GAS_LIMIT,
      forkUrl: ANVIL_FORK_URL,
      forkBlockNumber: FORK_BLOCK_NUMBER,
      blockBaseFeePerGas: 0,
      startTimeout: 60_000,
    },
  });
}

vi.mock('server-only', () => {
  return {
    // mock server-only module
  };
});
