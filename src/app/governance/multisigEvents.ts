'use server';

import { and, eq, SQL, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';
import { Address } from 'viem';

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
    // Compare on lower(address): ingestion normalizes new rows, but rows written
    // before that normalization existed may still hold a checksummed address.
    sql`lower(${eventsTable.address}) = ${multisigAddress.toLowerCase()}`,
  ];

  if (transactionId !== undefined) {
    filters.push(eq(sql`(${eventsTable.args}->>'transactionId')::bigint`, transactionId));
  }

  const events = await database
    .select()
    .from(eventsTable)
    .where(and(...filters));

  return events;
}
