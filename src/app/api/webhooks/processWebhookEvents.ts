import { governanceABI, multiSigABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { Event } from 'src/app/governance/events';
import { CacheKeys } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { eventsTable, votesTable } from 'src/db/schema';
import updateApprovalsInDB from 'src/features/governance/updateApprovalsInDB';
import updateProposalsInDB from 'src/features/governance/updateProposalsInDB';
import {
  ingestedViaConflictSet,
  IngestSource,
  withIngestionMetadata,
} from 'src/features/governance/utils/events/ingest';
import { decodeAndPrepareProposalEvent } from 'src/features/governance/utils/events/proposal';
import { decodeAndPrepareVoteEvent } from 'src/features/governance/utils/events/vote';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill'; // BigInt.prototype.toJSON so bigint args serialize into jsonb
import { decodeEventLog, GetContractEventsParameters } from 'viem';

type GovernanceEventName = Exclude<
  GetContractEventsParameters<typeof governanceABI>['eventName'],
  undefined
>;
type MultiSigEventName = Exclude<
  GetContractEventsParameters<typeof multiSigABI>['eventName'],
  undefined
>;
export type EventName = GovernanceEventName | MultiSigEventName;

export const MULTISIG_EVENT_NAMES = new Set(['Confirmation', 'Revocation', 'Execution']);

export type ParsedEvent = {
  name: EventName;
  contractAddress: string;
  topics: [`0x${string}`, ...`0x${string}`[]];
  data: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  transactionIds: bigint[];
};

export async function processWebhookEvents(
  parsedEvents: ParsedEvent[],
  source: IngestSource,
): Promise<void> {
  let proposalId: bigint | undefined | null;
  const proposalIdsToUpdate: Set<bigint> = new Set();
  const multisigTxIdsToProcess: Set<bigint> = new Set();

  // Fetch the approver multisig address once for all events
  const approverMultisigAddress = await celoPublicClient.readContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'approver',
    args: [],
  });

  for (const event of parsedEvents) {
    // Check if this is a MultiSig event by comparing contract address
    const isMultiSigEvent =
      event.contractAddress.toLowerCase() === approverMultisigAddress.toLowerCase() &&
      MULTISIG_EVENT_NAMES.has(event.name);

    // Persist the delivered event straight from the webhook payload. Previously every
    // delivery triggered a cursor->head eth_getLogs scan to ingest events, but public
    // forno rejects wide ranges ("query exceeds range") and the payload already carries
    // the full log — so we store it directly. The hourly cron remains the catch-up
    // backfill that fills any gap from a missed delivery.
    await saveWebhookEvent(event, isMultiSigEvent, source);

    if (isMultiSigEvent) {
      for (const txId of event.transactionIds) {
        multisigTxIdsToProcess.add(txId);
      }
    } else {
      const eventData = { topics: event.topics, data: event.data } as unknown as Event;

      // NOTE: for clarity, we don't need to parallelize `handleXXXEvent`
      // since they just exit early when the event doesnt match
      proposalId = await decodeAndPrepareProposalEvent(event.name, eventData);
      if (proposalId) {
        proposalIdsToUpdate.add(proposalId);
        continue;
      }

      proposalId = await decodeAndPrepareVoteEvent(
        event.name,
        eventData,
        celoPublicClient.chain.id,
      ).then(upsertVotes);

      // NOTE: we're keeping track of the proposalId because voting for a
      // proposal means the networkWeight will be changed and the proposal row
      // needs to be updated
      if (proposalId) {
        proposalIdsToUpdate.add(proposalId);
        revalidateTag(CacheKeys.AllVotes);
      }
    }
  }

  // Update approvals if we have MultiSig events
  if (multisigTxIdsToProcess.size) {
    await updateApprovalsInDB(celoPublicClient, [...multisigTxIdsToProcess]);
  }

  // Update proposals if needed
  if (proposalIdsToUpdate.size) {
    await updateProposalsInDB(celoPublicClient, [...proposalIdsToUpdate], 'update');
  }
}

/**
 * Stores a single webhook-delivered event into the events table, decoding its
 * args from topics+data so downstream queries (e.g. args->>'proposalId') keep
 * working. Dedupes on the (eventName, transactionHash, chainId) primary key and
 * records ingestion provenance via ingestedVia.
 */
async function saveWebhookEvent(event: ParsedEvent, isMultiSig: boolean, source: IngestSource) {
  let args: Record<string, unknown> = {};
  try {
    const decoded = decodeEventLog({
      abi: isMultiSig ? multiSigABI : governanceABI,
      topics: event.topics,
      data: event.data,
      strict: false,
    });
    args = (decoded.args ?? {}) as Record<string, unknown>;
  } catch {
    // Persist topics/data even if decoding fails; the cron backfill can self-heal args later.
  }

  const row = {
    eventName: event.name,
    args,
    address: event.contractAddress,
    topics: event.topics,
    data: event.data,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
  };

  await database
    .insert(eventsTable)
    .values(withIngestionMetadata([row], celoPublicClient.chain.id, source))
    .onConflictDoUpdate({
      target: [eventsTable.eventName, eventsTable.transactionHash, eventsTable.chainId],
      set: ingestedViaConflictSet,
    });
}

async function upsertVotes(rows: (typeof votesTable)['$inferInsert'][]) {
  if (!rows.length) return null;

  const { count } = await database
    .insert(votesTable)
    .values(rows)
    .onConflictDoUpdate({
      set: { count: sql`excluded.count` },
      target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
    });

  // eslint-disable-next-line no-console
  console.info(`Inserted ${count} vote records for proposal: ${rows[0].proposalId}`);
  return BigInt(rows[0].proposalId);
}
