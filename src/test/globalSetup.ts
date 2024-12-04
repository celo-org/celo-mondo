import { startProxy } from '@viem/anvil';
import {
  ANVIL_CHAIN_ID,
  ANVIL_STATE_PATH,
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
      chainId: ANVIL_CHAIN_ID,
      state: ANVIL_STATE_PATH,
      mnemonic: TEST_MNEMONIC,
      balance: TEST_BALANCE,
      gasPrice: TEST_GAS_PRICE,
      gasLimit: TEST_GAS_LIMIT,
      blockBaseFeePerGas: 0,
      stopTimeout: 1000,
    },
  });
}
