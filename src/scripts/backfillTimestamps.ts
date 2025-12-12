import 'dotenv/config';

/* eslint no-console: 0 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { sleep } from 'src/utils/async';
import { unixTimestampToISOString } from 'src/utils/time';
import { celo } from 'viem/chains';

const API_TOKEN = process.env.ETHERSCAN_API_TOKEN;
if (!API_TOKEN) {
  throw new Error('env.ETHERSCAN_API_TOKEN is required for this script');
}

async function backfillTimestamps() {
  const proposalIds = process.argv[2]
    ? process.argv[2].split(',').map((x) => parseInt(x, 10))
    : undefined;
  console.log(
    `Starting backfilling timestamps update ${proposalIds ? `for ids ${proposalIds.join(', ')}` : ''}…`,
  );

  const eventNames = [
    'ProposalQueued',
    'ProposalDequeued',
    'ProposalApproved',
    'ProposalExecuted',
  ] as const;

  const conditions = [eq(proposalsTable.chainId, celo.id)];

  if (proposalIds) {
    conditions.push(inArray(proposalsTable.id, proposalIds));
  }

  const proposals = await database
    .select()
    .from(proposalsTable)
    .where(and(...conditions))
    .orderBy(proposalsTable.id);

  for (const proposal of proposals) {
    const events = await database
      .select()
      .from(eventsTable)
      .where(
        and(
          inArray(eventsTable.eventName, eventNames),
          eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposal.id),
        ),
      );

    if (!events.length) {
      console.error(`No events for ${proposal.id}`);
      continue;
    }

    const queuedAt = events.find((x) => x.eventName === 'ProposalQueued');
    const dequeuedAt = events.find((x) => x.eventName === 'ProposalDequeued');
    const approvedAt = events.find((x) => x.eventName === 'ProposalApproved');
    const executedAt = events.find((x) => x.eventName === 'ProposalExecuted');

    const base = `https://api.etherscan.io/v2/api?chainid=42220&module=block&action=getblockreward&apikey=${API_TOKEN}`;
    const [approvedAtTs, executedAtTs] = (
      await Promise.all([
        approvedAt && fetch(base + `&blockno=${approvedAt?.blockNumber}`).then((x) => x.json()),
        executedAt && fetch(base + `&blockno=${executedAt?.blockNumber}`).then((x) => x.json()),
      ])
    ).map((x) => x?.result.timeStamp as string);

    const queuedAtTs = (queuedAt?.args as { timestamp: string })?.timestamp;
    const dequeuedAtTs = (dequeuedAt?.args as { timestamp: string })?.timestamp;

    console.log({
      id: proposal.id,
      queuedAtTs,
      queuedAt: unixTimestampToISOString(queuedAtTs),
      queuedAtBlockNumber: queuedAt?.blockNumber,

      dequeuedAtTs,
      dequeuedAt: unixTimestampToISOString(dequeuedAtTs),
      dequeuedAtBlockNumber: dequeuedAt?.blockNumber,

      approvedAtTs,
      approvedAt: unixTimestampToISOString(approvedAtTs),
      approvedAtBlockNumber: approvedAt?.blockNumber,

      executedAtTs,
      executedAt: unixTimestampToISOString(executedAtTs),
      executedAtBlockNumber: executedAt?.blockNumber,
    });
    await database
      .update(proposalsTable)
      .set({
        queuedAt: unixTimestampToISOString(queuedAtTs),
        queuedAtBlockNumber: queuedAt?.blockNumber,

        dequeuedAt: unixTimestampToISOString(dequeuedAtTs),
        dequeuedAtBlockNumber: dequeuedAt?.blockNumber,

        approvedAt: unixTimestampToISOString(approvedAtTs),
        approvedAtBlockNumber: approvedAt?.blockNumber,

        executedAt: unixTimestampToISOString(executedAtTs),
        executedAtBlockNumber: executedAt?.blockNumber,
      })
      .where(eq(proposalsTable.id, proposal.id));

    await sleep(500);
  }
}

// Run the script
backfillTimestamps()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
