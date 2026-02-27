import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';
import { TEST_CHAIN_ID } from 'src/test/database';
import { describe, expect, it, vi } from 'vitest';

vi.mock('src/features/governance/fetchFromRepository', () => ({
  fetchProposalsFromRepo: vi.fn().mockResolvedValue([]),
}));

vi.mock('src/config/proposals.json', () => ({
  default: [],
}));

function createMockClient() {
  return {
    chain: { id: TEST_CHAIN_ID },
    readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'getProposal') {
        return [
          '0x1234567890123456789012345678901234567890',
          100n,
          1234567890n,
          1n,
          '', // empty URL — no metadata can be resolved
          1000n,
          false,
        ];
      }
      if (functionName === 'getProposalStage') {
        return 1;
      }
    }),
    getBlock: vi.fn().mockResolvedValue({ timestamp: 1234567890n }),
  } as any;
}

describe('updateProposalsInDB', () => {
  it('does not crash when all proposals are filtered out due to missing metadata', async () => {
    // Insert an event so the query finds something
    await database.insert(eventsTable).values({
      chainId: TEST_CHAIN_ID,
      eventName: 'ProposalQueued',
      args: {
        proposalId: '999',
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '1',
        timestamp: '1234567890',
        deposit: '100',
      },
      address: '0x0000000000000000000000000000000000000000',
      topics: ['0xabc123' as `0x${string}`],
      data: '0x' as `0x${string}`,
      blockNumber: 59165954n,
      transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000001',
    });

    const { default: updateProposalsInDB } = await import(
      'src/features/governance/updateProposalsInDB'
    );

    const infoSpy = vi.spyOn(console, 'info');
    const client = createMockClient();

    // Should not throw — previously this would crash with "values() must be called with at least one value"
    await expect(updateProposalsInDB(client, [999n], 'update')).resolves.not.toThrow();

    expect(infoSpy).toHaveBeenCalledWith(
      'No proposals to insert (all filtered out due to missing metadata)',
    );
  });
});
