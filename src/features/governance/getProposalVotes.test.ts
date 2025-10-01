import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { TEST_CHAIN_ID } from 'src/test/database';
import { describe, expect, it } from 'vitest';

describe('getProposals', () => {
  it('basically works', async () => {
    await database.insert(proposalsTable).values([
      {
        id: 1,
        author: 'test author',
        cgp: 1,
        chainId: TEST_CHAIN_ID,
        stage: ProposalStage.Expiration,
        timestamp: 1753277605,
        title: 'test 1',
      },
      {
        id: 2,
        author: 'test author no votes',
        cgp: 2,
        chainId: TEST_CHAIN_ID,
        stage: ProposalStage.Queued,
        timestamp: 1753277605,
        title: 'test 2',
      },
    ]);

    await database.insert(votesTable).values([
      { proposalId: 1, type: VoteType.Yes, count: 10n, chainId: TEST_CHAIN_ID },
      { proposalId: 1, type: VoteType.No, count: 20n, chainId: TEST_CHAIN_ID },
      {
        proposalId: 1,
        type: VoteType.Abstain,
        count: BigInt(Number.MAX_SAFE_INTEGER) * 2n,
        chainId: TEST_CHAIN_ID,
      },
    ]);

    await expect(getProposalVotes(42220)).resolves.toMatchInlineSnapshot(`
      {
        "1": {
          "abstain": 18014398509481982n,
          "no": 20n,
          "yes": 10n,
        },
      }
    `);
  });

  it('handles no votes', async () => {
    await database.insert(proposalsTable).values([
      {
        id: 1,
        author: 'test author',
        cgp: 1,
        chainId: TEST_CHAIN_ID,
        stage: ProposalStage.Expiration,
        timestamp: 1753277605,
        title: 'test 1',
      },
    ]);

    await expect(getProposalVotes(42220)).resolves.toMatchInlineSnapshot(`{}`);
  });
});
