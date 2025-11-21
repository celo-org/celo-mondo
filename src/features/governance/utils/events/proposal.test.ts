import { Event } from 'src/app/governance/events';
import { decodeAndPrepareProposalEvent } from 'src/features/governance/utils/events/proposal';
import { describe, expect, it, vi } from 'vitest';

describe('decodeAndPrepareProposalEvent', () => {
  it('ignores unhandled events', async () => {
    const mockEvent: Event = {
      address: '0x0',
      args: {},
      blockNumber: 123n,
      chainId: 42220,
      data: '0x',
      eventName: 'ProposalExecuted',
      topics: ['0x'],
      transactionHash: '0x',
    };
    const stdoutSpy = vi.spyOn(console, 'info').mockReturnValueOnce();
    await expect(decodeAndPrepareProposalEvent('WrongEvent', mockEvent)).resolves.toEqual(null);
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0]).toMatchInlineSnapshot(`
      [
        "Not a proposal event",
      ]
    `);
  });

  it('throws on malformed events', async () => {
    const mockEvent: Event = {
      address: '0x0',
      args: {},
      blockNumber: 123n,
      chainId: 42220,
      data: '0x',
      eventName: 'ProposalExecuted',
      topics: ['0x'],
      transactionHash: '0x',
    };
    await expect(decodeAndPrepareProposalEvent('ProposalExecuted', mockEvent)).rejects
      .toMatchInlineSnapshot(`
      [AbiEventSignatureNotFoundError: Encoded event signature "0x" not found on ABI.
      Make sure you are using the correct ABI and that the event exists on it.
      You can look up the signature here: https://openchain.xyz/signatures?query=0x.

      Docs: https://viem.sh/docs/contract/decodeEventLog
      Version: viem@2.39.3]
    `);
  });

  it('processes proper events', async () => {
    const mockEvent: Event = {
      eventName: 'ProposalExecuted',
      args: { proposalId: '143' },
      address: '0xd533ca259b330c7a88f74e000a3faea2d63b7972',
      topics: [
        '0x712ae1383f79ac853f8d882153778e0260ef8f03b504e2866e0593e04d2b291f',
        '0x000000000000000000000000000000000000000000000000000000000000008f',
      ],
      data: '0x',
      blockNumber: 23049026n,
      transactionHash: '0x012932ee24ac083380c0950cab182747501dadfa55dba312de66a919260417fd',
      chainId: 42220,
    };

    await expect(decodeAndPrepareProposalEvent('ProposalExecuted', mockEvent)).resolves.toBe(143n);
  });
});
