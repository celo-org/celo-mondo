import { governanceABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import CachedMetadata from 'src/config/proposals.json';
import { proposalsTable, votesTable } from 'src/db/schema';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
import { ProposalMetadata, ProposalStage, VoteType } from 'src/features/governance/types';
import { decodeVoteEventLog, fetchProposalVoters } from 'src/features/governance/utils/votes';
import { celoPublicClient } from 'src/utils/client';
import { decodeEventLog, GetContractEventsParameters } from 'viem';

type EventName = GetContractEventsParameters<typeof governanceABI>['eventName'];
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
      contract: { address: Address; addressLabel: string; name: string; label: string };
      indexInLog: number;
    };
  };
};

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  if (
    !assertSignature(
      body,
      request.headers.get('X-MultiBaas-Signature'),
      request.headers.get('X-MultiBaas-Timestamp'),
    )
  ) {
    return new Response(null, { status: 403 });
  }

  for (const {
    data: { event },
  } of body) {
    // in theory we _could_ just insert the `event.rawFields` directly in the db...
    await fetchHistoricalEventsAndSaveToDBProgressively(event.name, celoPublicClient);

    await handleVoteEvent(event);
    await handleProposalEvent(event);
  }

  return new Response(null, { status: 200 });
}

function assertSignature(
  payload: unknown,
  signature: string | null,
  timestamp: string | null,
): payload is MultibassEvent[] {
  if (!payload || !signature || !timestamp) {
    return false;
  }

  const hmac = createHmac('sha256', process.env.MULTIBAAS_WEBHOOK_SECRET!);
  hmac.update(Buffer.from(JSON.stringify(payload)));
  hmac.update(timestamp);
  const signature_ = hmac.digest().toString('hex');

  if (signature !== signature_) {
    console.log({
      payload,
      json: JSON.stringify(payload),
      signature,
      signature_,
    });
    return false;
  }
  return true;
}

async function handleVoteEvent(event: MultibassEvent['data']['event']): Promise<void> {
  if (
    !(
      [
        'ProposalVoted',
        'ProposalVotedV2',
        'ProposalVoteRevoked',
        'ProposalVoteRevokedV2',
      ] as EventName[]
    ).includes(event.name)
  ) {
    return;
  }

  const proposal = decodeVoteEventLog(JSON.parse(event.rawFields));
  if (!proposal || !proposal.proposalId) {
    throw new Error('Couldnt update the votes');
  }

  const { totals } = await fetchProposalVoters(proposal.proposalId);
  await database
    .insert(votesTable)
    .values(
      Object.entries(totals).map(([type, count]) => ({
        type: type as VoteType,
        count,
        chainId: celoPublicClient.chain.id,
        proposalId: proposal.proposalId,
      })),
    )
    .onConflictDoUpdate({
      set: { count: sql`excluded.count` },
      target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
    });
}

async function handleProposalEvent(event: MultibassEvent['data']['event']): Promise<void> {
  if (
    !(
      [
        'ProposalExecuted',
        'ProposalApproved',
        'ProposalExpired',
        'ProposalDequeued',
        'ProposalQueued',
      ] as EventName[]
    ).includes(event.name)
  ) {
    return;
  }

  const { topics, data } = JSON.parse(event.rawFields);
  const {
    args: { proposalId },
  } = decodeEventLog({
    abi: governanceABI,
    topics,
    data,
    eventName: event.name as
      | 'ProposalExecuted'
      | 'ProposalApproved'
      | 'ProposalExpired'
      | 'ProposalDequeued'
      | 'ProposalQueued',
  });
  if (!proposalId) {
    throw new Error('Couldnt update the proposal');
  }

  const cached = CachedMetadata as ProposalMetadata[];
  const proposalsMetadata = await fetchProposalsFromRepo(cached, false);
  const [_proposer, _deposit, _timestampSec, _numTransactions, url, _networkWeight, _isApproved] =
    await celoPublicClient.readContract({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'getProposal',
      args: [proposalId],
    });

  let stage: ProposalStage;
  switch (event.name) {
    case 'ProposalExecuted':
      stage = ProposalStage.Executed;
      break;

    case 'ProposalApproved':
      stage = ProposalStage.Execution;
      break;

    case 'ProposalExpired':
      stage = ProposalStage.Expiration;
      break;

    case 'ProposalDequeued':
      stage = ProposalStage.Referendum;
      break;

    case 'ProposalQueued':
      stage = ProposalStage.Queued;
      break;

    default:
      throw new Error('Unknown event: ' + event.name);
  }
  const cgpMatch = url.match(/cgp-(\d+)\.md/);

  const metadata = proposalsMetadata.find(
    ({ id, cgp }) =>
      (id || -1) === Number(proposalId) || cgp === parseInt(cgpMatch?.[1] || '0', 10),
  );

  if (!metadata) {
    throw new Error(
      `-metadata not found for ${JSON.stringify({ proposalId, cgp: cgpMatch?.[1] })}`,
    );
  }

  const createdAt =
    event.name === 'ProposalQueued'
      ? parseInt(event.inputs.find((x) => x.name == 'timestamp')!.value!, 10)
      : Date.now(); // createdAt will only be inserted if raw doesnt exist yet

  await database
    .insert(proposalsTable)
    .values({
      id: Number(proposalId),
      chainId: celoPublicClient.chain.id,
      createdAt,
      cgp: metadata.cgp,
      author: metadata.author,
      url: metadata.url!,
      cgpUrl: metadata.cgpUrl,
      cgpUrlRaw: metadata.cgpUrlRaw,
      stage,
      title: metadata.title,
    })
    .onConflictDoUpdate({
      set: {
        // NOTE: normally only the stage should be updated over time...
        stage: sql`excluded."stage"`,
      },
      target: [proposalsTable.chainId, proposalsTable.id],
    });
}
