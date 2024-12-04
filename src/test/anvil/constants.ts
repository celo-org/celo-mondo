import { readFileSync } from 'fs';

export const VITE_ANVIL_CELO_VERSION = process.env.VITE_ANVIL_CELO_VERSION as 'L1' | 'L2';

if (!['L1', 'L2'].includes(VITE_ANVIL_CELO_VERSION)) {
  throw new Error(
    'Missing or incorrect environment variable "VITE_ANVIL_CELO_VERSION", must be L1 or L2',
  );
}
export const ANVIL_STATE_PATH = require.resolve(
  VITE_ANVIL_CELO_VERSION === 'L1'
    ? '@celo/devchain-anvil/devchain.json'
    : '@celo/devchain-anvil/l2-devchain.json',
);
const json = JSON.parse(readFileSync(ANVIL_STATE_PATH).toString());
export const FORK_BLOCK_NUMBER = BigInt(json.block.number as `0x${string}`);

export const ANVIL_CHAIN_ID = 12345;
export const ANVIL_FORK_URL = 12345;

export const ANVIL_BASE_HOST = '127.0.0.1:8545';

export const TEST_MNEMONIC =
  'concert load couple harbor equip island argue ramp clarify fence smart topic';
export const TEST_BALANCE = 1000000;
export const TEST_GAS_PRICE = 0;
export const TEST_GAS_LIMIT = 20000000;
