import { fetchMultiSigEvents } from 'src/app/governance/multisigEvents';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';
import { TEST_CHAIN_ID } from 'src/test/database';
import { Address } from 'viem';
import { describe, expect, it } from 'vitest';

const APPROVER_MULTISIG = '0x41822d8A191fcfB1cfcA5F7048818aCd8eE933d3' as Address;

function confirmationRow(overrides: { address: string; transactionHash: string; sender: string }) {
  return {
    chainId: TEST_CHAIN_ID,
    eventName: 'Confirmation' as const,
    args: { sender: overrides.sender, transactionId: '274' },
    address: overrides.address,
    topics: ['0x4a504a94899432a9846e1aa406dceb1bcfd538bb839071d49d1e5e23f5be30ef'] as [
      `0x${string}`,
      ...`0x${string}`[],
    ],
    data: '0x' as `0x${string}`,
    blockNumber: 76523070n,
    transactionHash: overrides.transactionHash,
    logIndex: 0,
  };
}

describe('fetchMultiSigEvents', () => {
  it('finds rows whose address was stored checksummed as well as lowercase', async () => {
    await database.insert(eventsTable).values([
      confirmationRow({
        address: APPROVER_MULTISIG.toLowerCase(),
        transactionHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        sender: '0x0a1c327FB17870488F12555e56A3a517e493cc46',
      }),
      confirmationRow({
        address: APPROVER_MULTISIG,
        transactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        sender: '0x936e62E72727E47297D218c2F829ef4C36427D9A',
      }),
    ]);

    const events = await fetchMultiSigEvents(TEST_CHAIN_ID, APPROVER_MULTISIG, 'Confirmation');

    expect(events).toHaveLength(2);
  });

  it('still filters out events emitted by another contract', async () => {
    await database.insert(eventsTable).values(
      confirmationRow({
        address: '0x0000000000000000000000000000000000000001',
        transactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
        sender: '0x0a1c327FB17870488F12555e56A3a517e493cc46',
      }),
    );

    const events = await fetchMultiSigEvents(TEST_CHAIN_ID, APPROVER_MULTISIG, 'Confirmation');

    expect(events).toHaveLength(0);
  });

  it('narrows to a single multisig transaction id regardless of address casing', async () => {
    await database.insert(eventsTable).values([
      confirmationRow({
        address: APPROVER_MULTISIG,
        transactionHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
        sender: '0x936e62E72727E47297D218c2F829ef4C36427D9A',
      }),
      {
        ...confirmationRow({
          address: APPROVER_MULTISIG,
          transactionHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
          sender: '0xF7DE62B65768a169279be74b12FaA65a22FB38D3',
        }),
        args: { sender: '0xF7DE62B65768a169279be74b12FaA65a22FB38D3', transactionId: '275' },
      },
    ]);

    const events = await fetchMultiSigEvents(TEST_CHAIN_ID, APPROVER_MULTISIG, 'Confirmation', {
      transactionId: 274n,
    });

    expect(events).toHaveLength(1);
    expect((events[0].args as { transactionId: string }).transactionId).toBe('274');
  });
});
