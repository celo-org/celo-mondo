import { parseEther } from 'viem';
import { celo } from 'viem/chains';

export const FORK_BLOCK_NUMBER = 29162229n;

export const ANVIL_CHAIN_ID = celo.id;
export const ANVIL_FORK_URL = 'https://public-archive-nodes.celo-testnet.org';

export const ANVIL_BASE_HOST = '127.0.0.1:8545';

export const TEST_MNEMONIC =
  'concert load couple harbor equip island argue ramp clarify fence smart topic';
export const TEST_BALANCE = parseEther('1000');
export const TEST_GAS_PRICE = 0;
export const TEST_GAS_LIMIT = 20000000n;
