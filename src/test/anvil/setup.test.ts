import { expect, test } from 'vitest';
import { FORK_BLOCK_NUMBER, TEST_BALANCE } from './constants';
import { testClient, walletClient } from './utils';

test('anvil is setup', async () => {
  await expect(walletClient.getAddresses()).resolves.toMatchInlineSnapshot(`
      [
        "0x5409ED021D9299bf6814279A6A1411A7e866A631",
      ]
    `);

  await expect(
    testClient.getBalance({ address: (await walletClient.getAddresses())[0] }),
  ).resolves.toBe(BigInt(TEST_BALANCE) * 10n ** 18n);
  await expect(testClient.getBlobBaseFee()).resolves.toBe(0n);
  await expect(testClient.getBlockNumber()).resolves.toBe(FORK_BLOCK_NUMBER);
});
