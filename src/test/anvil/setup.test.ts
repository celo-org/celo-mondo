import { expect, test } from 'vitest';
import { FORK_BLOCK_NUMBER, TEST_BALANCE } from './constants';
import { publicClient, walletClient } from './utils';

test('anvil is setup', async () => {
  await expect(walletClient.getAddresses()).resolves.toMatchInlineSnapshot(`
      [
        "0x5409ED021D9299bf6814279A6A1411A7e866A631",
      ]
    `);
  await expect(
    publicClient.getBalance({ address: (await walletClient.getAddresses())[0] }),
  ).resolves.toBe(TEST_BALANCE);
  await expect(publicClient.getBlobBaseFee()).resolves.toBe(0n);
  await expect(publicClient.getBlockNumber()).resolves.toBe(FORK_BLOCK_NUMBER);
}, 60_000);
