import { Event } from 'src/app/governance/events';
import { VoteAmounts, VoteType } from 'src/features/governance/types';
import { decodeAndPrepareVoteEvent } from 'src/features/governance/utils/events/vote';
import { describe, expect, it, vi } from 'vitest';

describe('decodeAndPrepareVoteEvent', () => {
  it('ignores unhandled events', () => {
    const mockEvent: Event = {
      address: '0x0',
      args: {},
      blockNumber: 123n,
      chainId: 42220,
      data: '0x',
      eventName: 'ProposalVoted',
      topics: ['0x'],
      transactionHash: '0x',
    };
    const stdoutSpy = vi.spyOn(console, 'info').mockReturnValueOnce();
    expect(decodeAndPrepareVoteEvent('WrongEvent', mockEvent, 42220)).resolves.toEqual([]);
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0]).toMatchInlineSnapshot(`
      [
        "Not a vote event",
      ]
    `);
  });

  it('throws on malformed events', () => {
    const mockEvent: Event = {
      address: '0x0',
      args: {},
      blockNumber: 123n,
      chainId: 42220,
      data: '0x',
      eventName: 'ProposalVoted',
      topics: ['0x'],
      transactionHash: '0x',
    };
    expect(
      decodeAndPrepareVoteEvent('ProposalVoted', mockEvent, 42220),
    ).rejects.toMatchInlineSnapshot(
      `[Error: Couldnt decode the vote event: {"address":"0x0","args":{},"blockNumber":"123","chainId":42220,"data":"0x","eventName":"ProposalVoted","topics":["0x"],"transactionHash":"0x"}]`,
    );
  });

  it('processes proper events', async () => {
    const mockEvent: Event = {
      eventName: 'ProposalVotedV2',
      args: {
        account: '0x9C542c0B5aF5e04E2D1e67cf1fC176E91bC18dA0',
        noVotes: '0',
        yesVotes: '11761491456155245246876',
        proposalId: '137',
        abstainVotes: '0',
      },
      address: '0xd533ca259b330c7a88f74e000a3faea2d63b7972',
      topics: [
        '0x683ebddc94b5b0a7dae3d1b6c168ad05684fcfd831b24ecb5ea9ecdf5524d028',
        '0x0000000000000000000000000000000000000000000000000000000000000089',
        '0x0000000000000000000000009c542c0b5af5e04e2d1e67cf1fc176e91bc18da0',
      ],
      data: '0x00000000000000000000000000000000000000000000027d977b94521d36799c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      blockNumber: 21797791n,
      transactionHash: '0x000063192bc74d7b2cb5cbec73572ff9ae649bbac31ae4704f74fda0ab9727c1',
      chainId: 42220,
    };

    vi.mock('src/features/governance/utils/votes', async (importActual) => {
      return {
        ...(await importActual()),
        sumProposalVotes: async () => {
          return {
            totals: {
              [VoteType.Yes]: 123n,
              [VoteType.No]: 456n,
              [VoteType.Abstain]: 789n,
            } as VoteAmounts,
          };
        },
      };
    });

    const rows = await decodeAndPrepareVoteEvent('ProposalVoted', mockEvent, 42220);
    expect(rows).toHaveLength(3);
    expect(rows[0].type).toBe(VoteType.Yes);
    expect(rows[1].type).toBe(VoteType.No);
    expect(rows[2].type).toBe(VoteType.Abstain);
    expect(rows.every((x) => x.chainId === 42220)).toBe(true);
    expect(
      rows.every((x) => x.proposalId === parseInt((mockEvent.args as any).proposalId, 10)),
    ).toBe(true);
  });
});
