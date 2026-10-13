import { startProxy } from '@viem/anvil';
import { formatEther } from 'viem';
import { celo } from 'viem/chains';
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
      // The fork block predates Celo's L2 launch, so its header has no blob-gas
      // fields. anvil 1.8+ defaults to the latest hardfork and then rejects every
      // eth_call on such a fork with "Excess blob gas not set". Pin a pre-Cancun
      // hardfork that matches the Celo L1 EVM of that block (no PUSH0 either).
      hardfork: 'Paris',
      blockBaseFeePerGas: 0,
      startTimeout: 60_000,
    },
  });
}
