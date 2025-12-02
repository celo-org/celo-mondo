'use server';

import { multiSigABI } from '@celo/abis';
import { and, eq, SQL, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';
import { Address, encodeEventTopics } from 'viem';

type MultiSigEventName = 'Confirmation' | 'Revocation' | 'Execution';

export type MultisigEvent = Awaited<ReturnType<typeof fetchMultiSigEvents>>[number];

export async function fetchMultiSigEvents(
  chainId: number,
  multisigAddress: Address,
  event: MultiSigEventName,
  { transactionId }: { transactionId?: bigint } = {},
) {
  const filters: SQL[] = [
    eq(eventsTable.chainId, chainId),
    eq(eventsTable.eventName, event),
    eq(eventsTable.address, multisigAddress.toLowerCase()),
  ];

  if (transactionId !== undefined) {
    const topics = encodeEventTopics({
      abi: multiSigABI,
      eventName: event,
      args: { transactionId },
    });
    filters.push(eq(sql`${eventsTable.topics}[2]`, topics[1]));
  }

  const events = await database
    .select()
    .from(eventsTable)
    .where(and(...filters));

  return events;
}
