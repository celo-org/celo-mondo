/* eslint no-console: 0 */

import { governanceABI } from '@celo/abis';
import { resolveAddress } from '@celo/actions';
import { sql } from 'drizzle-orm';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import database from 'src/config/database';
import { blocksProcessedTable, eventsTable } from 'src/db/schema';
import { GetContractEventsParameters, createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = dirname(__filename); // get the name of the directory

// @ts-expect-error
BigInt.prototype['toJSON'] = function () {
  return this.toString();
};

// TODO: remove this before merging
const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;
const client = createPublicClient({
  chain: celo,
  transport: http(archiveNode, {
    batch: true,
    timeout: 30_000, // half a min
  }),
});

const default_step = 100_000n;
async function fetchEvents(
  eventName: GetContractEventsParameters<typeof governanceABI>['eventName'],
) {
  const latestBlock = await client.getBlockNumber();

  let fromBlock = 0n;

  if (process.env.RESUME_FROM_BLOCK) {
    fromBlock = BigInt(process.env.RESUME_FROM_BLOCK);
  } else {
    const [lastBlock] = await database
      .select()
      .from(blocksProcessedTable)
      .where(
        sql`
        ${blocksProcessedTable.chainId} = ${client.chain.id} 
        AND ${blocksProcessedTable.eventName} = ${eventName}
      `,
      )
      .limit(1);

    fromBlock = lastBlock?.blockNumber || 0n;
  }

  if (fromBlock > 0n) {
    console.log(`Resuming ${eventName} from block ${fromBlock}... until ${latestBlock}`);
  }

  const query = {
    abi: governanceABI,
    eventName,
    // @ts-expect-error - not sure why client isn't happy honestly
    address: await resolveAddress(client, 'Governance'),
  } as const;

  let step = default_step;
  try {
    while (fromBlock < latestBlock) {
      try {
        const events = await client.getContractEvents({
          ...query,
          fromBlock,
          toBlock: fromBlock + step,
        });

        console.log(fromBlock);
        if (events.length) {
          const { count } = await database
            .insert(eventsTable)
            // @ts-expect-error
            .values(events.map((event) => ({ ...event, chainId: client.chain.id })))
            .onConflictDoNothing();
          console.log({ inserts: count });
        }

        fromBlock += step;
      } catch (e) {
        step /= 2n;
        if (step <= 1_000) {
          throw new Error('Retried too many times now...');
        } else {
          console.log(`Halved the block step down to ${step}`);
        }
      }
    }
  } finally {
    console.log(`Saving last processed block for ${eventName}: ${latestBlock}`);
    await database
      .insert(blocksProcessedTable)
      .values({
        blockNumber: latestBlock,
        eventName: eventName as string,
        chainId: client.chain.id,
      })
      .onConflictDoUpdate({
        set: { blockNumber: latestBlock },
        target: [blocksProcessedTable.eventName, blocksProcessedTable.chainId],
      });
  }
}

async function main() {
  await fetchEvents('ProposalQueued');
  await fetchEvents('ProposalDequeued');
  await fetchEvents('ProposalApproved');
  await fetchEvents('ProposalExecuted');
  await fetchEvents('ProposalVoted');
  await fetchEvents('ProposalVoteRevoked');
  await fetchEvents('ProposalVotedV2');
  await fetchEvents('ProposalVoteRevokedV2');
  await fetchEvents('ProposalUpvoted');
  await fetchEvents('ProposalUpvoteRevoked');
  await fetchEvents('ProposalExpired');

  process.exit(0);
}

main();
