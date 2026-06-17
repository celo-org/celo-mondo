import { and, eq } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';
import { TEST_CHAIN_ID } from 'src/test/database';
import { describe, expect, it } from 'vitest';

import { ingestedViaConflictSet, IngestSource, withIngestionMetadata } from './ingest';

const PK = {
  eventName: 'ProposalExecuted' as const,
  transactionHash: '0x63b59de749a858b7ca0973357a651e9d893eb1d22b585b5c01d7dae2ae3c95aa',
};

function baseEvent() {
  return {
    ...PK,
    args: { proposalId: '295' },
    address: '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972',
    topics: ['0x712ae1383f79ac853f8d882153778e0260ef8f03b504e2866e0593e04d2b291f'] as [
      `0x${string}`,
      ...`0x${string}`[],
    ],
    data: '0x' as `0x${string}`,
    blockNumber: 69399792n,
  };
}

async function ingest(source: IngestSource) {
  await database
    .insert(eventsTable)
    .values(withIngestionMetadata([baseEvent()], TEST_CHAIN_ID, source))
    .onConflictDoUpdate({
      target: [eventsTable.eventName, eventsTable.transactionHash, eventsTable.chainId],
      set: ingestedViaConflictSet,
    });
}

async function readRow() {
  const [row] = await database
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.eventName, PK.eventName),
        eq(eventsTable.transactionHash, PK.transactionHash),
        eq(eventsTable.chainId, TEST_CHAIN_ID),
      ),
    );
  return row;
}

const tick = () => new Promise((r) => setTimeout(r, 5));

describe('event ingestion provenance', () => {
  it('records the provider and a timestamp on first insert', async () => {
    await ingest('alchemy');
    const row = await readRow();

    expect(Object.keys(row.ingestedVia ?? {})).toEqual(['alchemy']);
    expect(row.ingestedVia?.alchemy).toBeTruthy();
    expect(row.ingestedAt).toBeTruthy();
  });

  it('accumulates a second provider without overwriting the first (one row, both providers)', async () => {
    await ingest('alchemy');
    const first = await readRow();
    await tick();
    await ingest('multibaas');
    const row = await readRow();

    // still a single row (PK dedup)
    const all = await database.select().from(eventsTable);
    expect(all).toHaveLength(1);

    // both providers present, alchemy timestamp unchanged, ingestedAt unchanged
    expect(Object.keys(row.ingestedVia ?? {}).sort()).toEqual(['alchemy', 'multibaas']);
    expect(row.ingestedVia?.alchemy).toBe(first.ingestedVia?.alchemy);
    expect(row.ingestedVia?.multibaas).toBeTruthy();
    expect(row.ingestedAt).toEqual(first.ingestedAt);
  });

  it('keeps the first arrival timestamp when the same provider re-delivers', async () => {
    await ingest('alchemy');
    const first = await readRow();
    await tick();
    await ingest('alchemy');
    const row = await readRow();

    expect(row.ingestedVia?.alchemy).toBe(first.ingestedVia?.alchemy);
  });

  it('cron-sourced ingestion is recorded too', async () => {
    await ingest('cron');
    const row = await readRow();
    expect(Object.keys(row.ingestedVia ?? {})).toEqual(['cron']);
  });
});
