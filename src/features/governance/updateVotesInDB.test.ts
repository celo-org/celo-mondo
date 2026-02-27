import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import updateVotesInDB from 'src/features/governance/updateVotesInDB';
import { TEST_CHAIN_ID } from 'src/test/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/features/governance/utils/votes', () => ({
  sumProposalVotes: vi.fn().mockResolvedValue({
    totals: {
      [VoteType.Yes]: 100n,
      [VoteType.No]: 50n,
      [VoteType.Abstain]: 25n,
    },
  }),
}));

function insertProposal(id: number) {
  return database.insert(proposalsTable).values({
    id,
    chainId: TEST_CHAIN_ID,
    cgp: id,
    author: 'test',
    title: `Proposal ${id}`,
    stage: ProposalStage.Referendum,
    timestamp: 1753277605,
  });
}

describe('updateVotesInDB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts votes for existing proposals', async () => {
    await insertProposal(100);

    await updateVotesInDB(TEST_CHAIN_ID, [100n]);

    const votes = await database.select().from(votesTable);
    expect(votes).toHaveLength(3);
    expect(votes.map((v) => v.type).sort()).toEqual(
      [VoteType.Abstain, VoteType.No, VoteType.Yes].sort(),
    );
    expect(votes.every((v) => v.proposalId === 100)).toBe(true);
  });

  it('skips votes for non-existent proposals', async () => {
    await insertProposal(100);

    const infoSpy = vi.spyOn(console, 'info');

    // Proposal 999 doesn't exist in the DB
    await updateVotesInDB(TEST_CHAIN_ID, [100n, 999n]);

    // Should log that it's skipping the non-existent proposal
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping votes for 1 non-existent proposal(s)'),
    );

    // Only votes for proposal 100 should be inserted
    const votes = await database.select().from(votesTable);
    expect(votes.every((v) => v.proposalId === 100)).toBe(true);
  });

  it('skips all votes when no proposals exist', async () => {
    const infoSpy = vi.spyOn(console, 'info');

    await updateVotesInDB(TEST_CHAIN_ID, [999n, 998n]);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping votes for 2 non-existent proposal(s)'),
    );

    const votes = await database.select().from(votesTable);
    expect(votes).toHaveLength(0);
  });
});
