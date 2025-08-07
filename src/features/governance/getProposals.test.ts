import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import { getProposals } from 'src/features/governance/getProposals';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { TEST_CHAIN_ID } from 'src/test/database';
import { describe, expect, it } from 'vitest';

describe('getProposals', async () => {
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
    ]);

    await expect(getProposals(42220)).resolves.toMatchInlineSnapshot(`
      [
        {
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "executedAt": null,
          "history": [],
          "id": 1,
          "networkWeight": null,
          "pastId": null,
          "proposer": null,
          "stage": 5,
          "timestamp": 1753277605,
          "title": "test 1",
          "transactionCount": null,
          "url": null,
          "votes": {
            "abstain": 0n,
            "no": 0n,
            "yes": 0n,
          },
        },
      ]
    `);
  });
  it('aggregates votes nicely', async () => {
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

    await expect(getProposals(42220)).resolves.toMatchInlineSnapshot(`
      [
        {
          "author": "test author no votes",
          "cgp": 2,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "executedAt": null,
          "history": [],
          "id": 2,
          "networkWeight": null,
          "pastId": null,
          "proposer": null,
          "stage": 1,
          "timestamp": 1753277605,
          "title": "test 2",
          "transactionCount": null,
          "url": null,
          "votes": {
            "abstain": 0n,
            "no": 0n,
            "yes": 0n,
          },
        },
        {
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "executedAt": null,
          "history": [],
          "id": 1,
          "networkWeight": null,
          "pastId": null,
          "proposer": null,
          "stage": 5,
          "timestamp": 1753277605,
          "title": "test 1",
          "transactionCount": null,
          "url": null,
          "votes": {
            "abstain": 18014398509481982n,
            "no": 20n,
            "yes": 10n,
          },
        },
      ]
    `);
  });
  it('links history properly', async () => {
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
        author: 'test author',
        cgp: 1,
        chainId: TEST_CHAIN_ID,
        stage: ProposalStage.Expiration,
        timestamp: 1753277606,
        title: 'test 2',
        pastId: 1,
      },
      {
        id: 3,
        author: 'test author',
        cgp: 1,
        chainId: TEST_CHAIN_ID,
        stage: ProposalStage.Referendum,
        timestamp: 1753277607,
        title: 'test 3',
        pastId: 2,
      },
    ]);
    await database.insert(votesTable).values([
      { proposalId: 1, type: VoteType.Yes, count: 10n, chainId: TEST_CHAIN_ID },
      { proposalId: 1, type: VoteType.No, count: 0n, chainId: TEST_CHAIN_ID },
      { proposalId: 1, type: VoteType.Abstain, count: 0n, chainId: TEST_CHAIN_ID },
      { proposalId: 2, type: VoteType.Yes, count: 100000n, chainId: TEST_CHAIN_ID },
      { proposalId: 2, type: VoteType.Abstain, count: 20n, chainId: TEST_CHAIN_ID },
      { proposalId: 3, type: VoteType.No, count: 42n, chainId: TEST_CHAIN_ID },
    ]);

    await expect(getProposals(42220)).resolves.toMatchInlineSnapshot(`
      [
        {
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "executedAt": null,
          "history": [
            2,
            1,
          ],
          "id": 3,
          "networkWeight": null,
          "pastId": 2,
          "proposer": null,
          "stage": 3,
          "timestamp": 1753277607,
          "title": "test 3",
          "transactionCount": null,
          "url": null,
          "votes": {
            "abstain": 0n,
            "no": 42n,
            "yes": 0n,
          },
        },
        {
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "executedAt": null,
          "history": [
            1,
          ],
          "id": 2,
          "networkWeight": null,
          "pastId": 1,
          "proposer": null,
          "stage": 5,
          "timestamp": 1753277606,
          "title": "test 2",
          "transactionCount": null,
          "url": null,
          "votes": {
            "abstain": 20n,
            "no": 0n,
            "yes": 100000n,
          },
        },
        {
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "executedAt": null,
          "history": [],
          "id": 1,
          "networkWeight": null,
          "pastId": null,
          "proposer": null,
          "stage": 5,
          "timestamp": 1753277605,
          "title": "test 1",
          "transactionCount": null,
          "url": null,
          "votes": {
            "abstain": 0n,
            "no": 0n,
            "yes": 10n,
          },
        },
      ]
    `);
  });
});
