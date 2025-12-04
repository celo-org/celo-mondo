import { governanceABI, multiSigABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { Event } from 'src/app/governance/events';
import { MultisigEvent } from 'src/app/governance/multisigEvents';
import { CacheKeys } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { sendAlertToSlack } from 'src/config/slackbot';
import { votesTable } from 'src/db/schema';
import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
import fetchHistoricalMultiSigEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalMultiSigEventsAndSaveToDBProgressively';
import updateApprovalsInDB from 'src/features/governance/updateApprovalsInDB';
import updateProposalsInDB from 'src/features/governance/updateProposalsInDB';
import { decodeAndPrepareProposalEvent } from 'src/features/governance/utils/events/proposal';
import { decodeAndPrepareVoteEvent } from 'src/features/governance/utils/events/vote';
import { celoPublicClient } from 'src/utils/client';
import { Address, GetContractEventsParameters } from 'viem';

type GovernanceEventName = GetContractEventsParameters<typeof governanceABI>['eventName'];
type MultiSigEventName = GetContractEventsParameters<typeof multiSigABI>['eventName'];
type EventName = GovernanceEventName | MultiSigEventName;

type MultibassEvent = {
  id: string;
  event: 'event.emitted';
  data: {
    triggeredAt: string;
    event: {
      name: EventName;
      signature: string;
      inputs: { name: string; value: string; hashed: boolean; type: string }[];
      rawFields: string;
      contract: {
        address: Address;
        addressLabel: string;
        name: string;
        label: string;
      };
      indexInLog: number;
    };
  };
};

export async function POST(request: NextRequest): Promise<Response> {
  const rawBody = await request.text();
  const body = assertSignature(
    rawBody,
    request.headers.get('X-MultiBaas-Signature'),
    request.headers.get('X-MultiBaas-Timestamp'),
  );
  if (!body) {
    return new Response(null, { status: 403 });
  }

  try {
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

    for (const {
      data: { event },
    } of body) {
      // Check if this is a MultiSig event by comparing contract address
      const isMultiSigEvent =
        event.contract.address.toLowerCase() === approverMultisigAddress.toLowerCase() &&
        ['Confirmation', 'Revocation', 'Execution'].includes(event.name!);

      if (isMultiSigEvent) {
        // Process MultiSig events
        await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(event.name!, celoPublicClient);

        const eventData: MultisigEvent = JSON.parse(event.rawFields);
        const transactionId = (eventData.args as any)?.transactionId;

        if (transactionId !== undefined) {
          multisigTxIdsToProcess.add(BigInt(transactionId));
        }
      } else {
        // Process Governance events
        // NOTE: in theory we _could_ just insert the `event.rawFields` directly in the db...
        await fetchHistoricalEventsAndSaveToDBProgressively(event.name!, celoPublicClient);

        const eventData: Event = JSON.parse(event.rawFields);

        // NOTE: for clarity, we don't need to parallelize `handleXXXEvent`
        // since they just exit early when the event doesnt match
        proposalId = await decodeAndPrepareProposalEvent(event.name!, eventData);
        if (proposalId) {
          proposalIdsToUpdate.add(proposalId);
          continue;
        }

        proposalId = await decodeAndPrepareVoteEvent(
          event.name!,
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

    return new Response(null, { status: 200 });
  } catch (err) {
    const error = err as Error;
    await sendAlertToSlack(`
Failed to process celo-mondo webhook:
\`\`\`json
${JSON.stringify(body)}
\`\`\`

\`\`\`
name: ${error.name}
message: ${error.message}
stack: ${error.stack}
\`\`\`
    `);

    return new Response(null, { status: 500 });
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

function assertSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null,
): MultibassEvent[] | false {
  if (!payload || !signature || !timestamp) {
    return false;
  }

  const hmac = createHmac('sha256', process.env.MULTIBAAS_WEBHOOK_SECRET!);
  hmac.update(Buffer.from(payload));
  hmac.update(timestamp);
  const signature_ = hmac.digest().toString('hex');

  if (signature !== signature_) {
    return false;
  }
  return JSON.parse(payload);
}
