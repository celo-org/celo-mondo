import 'dotenv/config';

/* eslint no-console: 0 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { sleep } from 'src/utils/async';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

async function backfillTimestamps() {
  console.log('Starting backfilling timestamps update...');

  // Setup client using the same env var pattern as other scripts
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;
  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode),
  }) as PublicClient<Transport, Chain>;

  const eventNames = [
    'ProposalQueued',
    'ProposalDequeued',
    'ProposalApproved',
    'ProposalExecuted',
  ] as const;

  const proposals = await database.select().from(proposalsTable).orderBy(proposalsTable.id);

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

    const API_TOKEN = 'redacted';
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
      queuedAt: unixTimestampToDate(queuedAtTs),
      queuedAtBlockNumber: queuedAt?.blockNumber,

      dequeuedAtTs,
      dequeuedAt: unixTimestampToDate(dequeuedAtTs),
      dequeuedAtBlockNumber: dequeuedAt?.blockNumber,

      approvedAtTs,
      approvedAt: unixTimestampToDate(approvedAtTs),
      approvedAtBlockNumber: approvedAt?.blockNumber,

      executedAtTs,
      executedAt: unixTimestampToDate(executedAtTs),
      executedAtBlockNumber: executedAt?.blockNumber,
    });
    await database
      .update(proposalsTable)
      .set({
        queuedAt: unixTimestampToDate(queuedAtTs),
        queuedAtBlockNumber: queuedAt?.blockNumber,

        dequeuedAt: unixTimestampToDate(dequeuedAtTs),
        dequeuedAtBlockNumber: dequeuedAt?.blockNumber,

        approvedAt: unixTimestampToDate(approvedAtTs),
        approvedAtBlockNumber: approvedAt?.blockNumber,

        executedAt: unixTimestampToDate(executedAtTs),
        executedAtBlockNumber: executedAt?.blockNumber,
      })
      .where(eq(proposalsTable.id, proposal.id));

    await sleep(500);
  }
}

function unixTimestampToDate(dateStr: string) {
  if (!dateStr) {
    return null;
  }

  return new Date(parseInt(dateStr, 10) * 1000).toISOString();
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
