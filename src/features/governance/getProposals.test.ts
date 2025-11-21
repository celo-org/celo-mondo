import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import { getProposals } from 'src/features/governance/getProposals';
import { ProposalStage } from 'src/features/governance/types';
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
    ]);

    await expect(getProposals(42220)).resolves.toMatchInlineSnapshot(`
      [
        {
          "approvedAt": null,
          "approvedAtBlockNumber": null,
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "dequeuedAt": null,
          "dequeuedAtBlockNumber": null,
          "executedAt": null,
          "executedAtBlockNumber": null,
          "history": [],
          "id": 1,
          "networkWeight": null,
          "pastId": null,
          "proposer": null,
          "queuedAt": null,
          "queuedAtBlockNumber": null,
          "stage": 5,
          "timestamp": 1753277605,
          "title": "test 1",
          "transactionCount": null,
          "url": null,
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

    await expect(getProposals(42220)).resolves.toMatchInlineSnapshot(`
      [
        {
          "approvedAt": null,
          "approvedAtBlockNumber": null,
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "dequeuedAt": null,
          "dequeuedAtBlockNumber": null,
          "executedAt": null,
          "executedAtBlockNumber": null,
          "history": [
            {
              "id": 2,
              "stage": 5,
            },
            {
              "id": 1,
              "stage": 5,
            },
          ],
          "id": 3,
          "networkWeight": null,
          "pastId": 2,
          "proposer": null,
          "queuedAt": null,
          "queuedAtBlockNumber": null,
          "stage": 3,
          "timestamp": 1753277607,
          "title": "test 3",
          "transactionCount": null,
          "url": null,
        },
        {
          "approvedAt": null,
          "approvedAtBlockNumber": null,
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "dequeuedAt": null,
          "dequeuedAtBlockNumber": null,
          "executedAt": null,
          "executedAtBlockNumber": null,
          "history": [
            {
              "id": 1,
              "stage": 5,
            },
          ],
          "id": 2,
          "networkWeight": null,
          "pastId": 1,
          "proposer": null,
          "queuedAt": null,
          "queuedAtBlockNumber": null,
          "stage": 5,
          "timestamp": 1753277606,
          "title": "test 2",
          "transactionCount": null,
          "url": null,
        },
        {
          "approvedAt": null,
          "approvedAtBlockNumber": null,
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "dequeuedAt": null,
          "dequeuedAtBlockNumber": null,
          "executedAt": null,
          "executedAtBlockNumber": null,
          "history": [],
          "id": 1,
          "networkWeight": null,
          "pastId": null,
          "proposer": null,
          "queuedAt": null,
          "queuedAtBlockNumber": null,
          "stage": 5,
          "timestamp": 1753277605,
          "title": "test 1",
          "transactionCount": null,
          "url": null,
        },
      ]
    `);
  });
  it('links history properly despite loops (human typos)', async () => {
    await database.insert(proposalsTable).values([
      {
        id: 1,
        author: 'test author',
        cgp: 1,
        chainId: TEST_CHAIN_ID,
        stage: ProposalStage.Expiration,
        timestamp: 1753277605,
        title: 'test 1',
        pastId: 3, // THIS IS WRONG!
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
    await expect(getProposals(42220)).resolves.toMatchInlineSnapshot(`
      [
        {
          "approvedAt": null,
          "approvedAtBlockNumber": null,
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "dequeuedAt": null,
          "dequeuedAtBlockNumber": null,
          "executedAt": null,
          "executedAtBlockNumber": null,
          "history": [
            {
              "id": 2,
              "stage": 5,
            },
            {
              "id": 1,
              "stage": 5,
            },
          ],
          "id": 3,
          "networkWeight": null,
          "pastId": 2,
          "proposer": null,
          "queuedAt": null,
          "queuedAtBlockNumber": null,
          "stage": 3,
          "timestamp": 1753277607,
          "title": "test 3",
          "transactionCount": null,
          "url": null,
        },
        {
          "approvedAt": null,
          "approvedAtBlockNumber": null,
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "dequeuedAt": null,
          "dequeuedAtBlockNumber": null,
          "executedAt": null,
          "executedAtBlockNumber": null,
          "history": [
            {
              "id": 1,
              "stage": 5,
            },
          ],
          "id": 2,
          "networkWeight": null,
          "pastId": 1,
          "proposer": null,
          "queuedAt": null,
          "queuedAtBlockNumber": null,
          "stage": 5,
          "timestamp": 1753277606,
          "title": "test 2",
          "transactionCount": null,
          "url": null,
        },
        {
          "approvedAt": null,
          "approvedAtBlockNumber": null,
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "dequeuedAt": null,
          "dequeuedAtBlockNumber": null,
          "executedAt": null,
          "executedAtBlockNumber": null,
          "history": [
            {
              "id": 3,
              "stage": 3,
            },
            {
              "id": 2,
              "stage": 5,
            },
            {
              "id": 1,
              "stage": 5,
            },
          ],
          "id": 1,
          "networkWeight": null,
          "pastId": 3,
          "proposer": null,
          "queuedAt": null,
          "queuedAtBlockNumber": null,
          "stage": 5,
          "timestamp": 1753277605,
          "title": "test 1",
          "transactionCount": null,
          "url": null,
        },
      ]
    `);
  });

  it('links history properly despite loops on itself (human typos)', async () => {
    await database.insert(proposalsTable).values([
      {
        id: 1,
        author: 'test author',
        cgp: 1,
        chainId: TEST_CHAIN_ID,
        stage: ProposalStage.Expiration,
        timestamp: 1753277605,
        title: 'test 1',
        pastId: 1, // THIS IS WRONG!
      },
    ]);

    await expect(getProposals(42220)).resolves.toMatchInlineSnapshot(`
      [
        {
          "approvedAt": null,
          "approvedAtBlockNumber": null,
          "author": "test author",
          "cgp": 1,
          "cgpUrl": null,
          "cgpUrlRaw": null,
          "chainId": 42220,
          "deposit": null,
          "dequeuedAt": null,
          "dequeuedAtBlockNumber": null,
          "executedAt": null,
          "executedAtBlockNumber": null,
          "history": [
            {
              "id": 1,
              "stage": 5,
            },
          ],
          "id": 1,
          "networkWeight": null,
          "pastId": 1,
          "proposer": null,
          "queuedAt": null,
          "queuedAtBlockNumber": null,
          "stage": 5,
          "timestamp": 1753277605,
          "title": "test 1",
          "transactionCount": null,
          "url": null,
        },
      ]
    `);
  });
});
