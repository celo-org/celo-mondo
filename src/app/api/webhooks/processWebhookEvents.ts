import { governanceABI, multiSigABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { Event } from 'src/app/governance/events';
import { CacheKeys } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { votesTable } from 'src/db/schema';
import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
import fetchHistoricalMultiSigEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalMultiSigEventsAndSaveToDBProgressively';
import updateApprovalsInDB from 'src/features/governance/updateApprovalsInDB';
import updateProposalsInDB from 'src/features/governance/updateProposalsInDB';
import { IngestSource } from 'src/features/governance/utils/events/ingest';
import { decodeAndPrepareProposalEvent } from 'src/features/governance/utils/events/proposal';
import { decodeAndPrepareVoteEvent } from 'src/features/governance/utils/events/vote';
import { celoArchiveClient, celoPublicClient } from 'src/utils/client';
import { GetContractEventsParameters } from 'viem';

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

    if (isMultiSigEvent) {
      // Process MultiSig events - use backfill result to capture ALL new transactionIds,
      // not just the one from the webhook event. This prevents missed approvals when the
      // backfill advances progress past events that the webhook didn't specifically trigger for.
      // Backfill scans event history via eth_getLogs over wide block ranges, which
      // public forno rejects ("query exceeds range") — use the archive node.
      const backfillResult = await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
        event.name,
        celoArchiveClient,
        { source },
      );

      for (const txId of backfillResult.transactionIds) {
        multisigTxIdsToProcess.add(txId);
      }

      // Also extract transactionIds from the webhook event itself as a fallback
      for (const txId of event.transactionIds) {
        multisigTxIdsToProcess.add(txId);
      }
    } else {
      // Process Governance events - capture backfill proposalIds to ensure we update
      // proposals that the backfill discovered (not just the webhook event itself).
      // Backfill scans event history via eth_getLogs over wide block ranges, which
      // public forno rejects ("query exceeds range") — use the archive node.
      const backfillProposalIds = await fetchHistoricalEventsAndSaveToDBProgressively(
        event.name,
        celoArchiveClient,
        undefined,
        source,
      );
      for (const id of backfillProposalIds) {
        proposalIdsToUpdate.add(id);
      }

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
