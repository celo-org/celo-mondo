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
  const rawBody = await request.text();
  const body = assertSignature(
    rawBody,
    request.headers.get('X-MultiBaas-Signature'),
    request.headers.get('X-MultiBaas-Timestamp'),
  );
  if (!body) {
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
    console.log({
      payload,
      json: payload,
      signature,
      signature_,
    });
    return false;
  }
  return JSON.parse(payload);
}

async function handleVoteEvent(event: MultibassEvent['data']['event']): Promise<void> {
  if (
    !assertEvent(
      ['ProposalVoted', 'ProposalVotedV2', 'ProposalVoteRevoked', 'ProposalVoteRevokedV2'] as const,
      event.name,
    )
  ) {
    return;
  }

  const proposal = decodeVoteEventLog(JSON.parse(event.rawFields));
  if (!proposal || !proposal.proposalId) {
    throw new Error('Couldnt update the votes');
  }

  const { totals } = await fetchProposalVoters(proposal.proposalId);
  const { count } = await database
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

  console.log(`Inserted ${count} vote records for proposal ${proposal.proposalId}`);
}

async function handleProposalEvent(event: MultibassEvent['data']['event']): Promise<void> {
  if (
    !assertEvent(
      [
        'ProposalExecuted',
        'ProposalApproved',
        'ProposalExpired',
        'ProposalDequeued',
        'ProposalQueued',
      ] as const,
      event.name,
    )
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
    eventName: event.name,
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
  const blockchainStage = await celoPublicClient.readContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getProposalStage',
    args: [proposalId],
  });

  // NOTE: it actually is the case `ProposalExpired` never gets called
  // according to Martin Volpe
  // >> nicolas: is it possible the ProposalExpired never gets emitted?
  // >> martin: probably because nobody takes the time to execute a expired proposal
  // >>         or the tx reverts, so it can’t even be emitted
  if (blockchainStage === ProposalStage.Expiration && stage !== ProposalStage.Executed) {
    stage = ProposalStage.Expiration;
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
      : 0; // createdAt will only be inserted if raw doesnt exist yet
  const proposer =
    event.name === 'ProposalQueued' ? event.inputs.find((x) => x.name == 'proposer')!.value! : ''; // proposer will only be inserted if raw doesnt exist yet
  const deposit =
    event.name === 'ProposalQueued'
      ? BigInt(event.inputs.find((x) => x.name == 'deposit')!.value!)
      : 0n; // deposit will only be inserted if raw doesnt exist yet
  const transactionCount =
    event.name === 'ProposalQueued'
      ? parseInt(event.inputs.find((x) => x.name == 'transactionCount')!.value!, 10)
      : 0; // transactionCount will only be inserted if raw doesnt exist yet

  await database
    .insert(proposalsTable)
    .values({
      id: Number(proposalId),
      chainId: celoPublicClient.chain.id,
      timestamp: createdAt,
      cgp: metadata.cgp,
      author: metadata.author,
      url: metadata.url!,
      cgpUrl: metadata.cgpUrl,
      cgpUrlRaw: metadata.cgpUrlRaw,
      stage,
      title: metadata.title,
      proposer,
      deposit,
      executedAt: metadata.timestampExecuted ? metadata.timestampExecuted / 1000 : null,
      transactionCount,
    })
    .onConflictDoUpdate({
      set: {
        // NOTE: normally only the stage should be updated over time...
        stage: sql`excluded."stage"`,
        // NOTE: but maybe otherthings were updated in github?
        author: sql`excluded."author"`,
        url: sql`excluded."url"`,
        cgpUrl: sql`excluded."cgpUrl"`,
        cgpUrlRaw: sql`excluded."cgpUrlRaw"`,
        title: sql`excluded."title"`,
      },
      target: [proposalsTable.chainId, proposalsTable.id],
    });

  console.log(`Upserted proposal ${proposalId} to stage ${stage}`);

  const allProposals = await database
    .select({
      id: proposalsTable.id,
    })
    .from(proposalsTable)
    .where(sql`${proposalsTable.cgp} = ${metadata.cgp}`)
    .groupBy(proposalsTable.cgp);

  const ids = allProposals.map((x) => x.id);
  while (ids.length > 1) {
    const [pastId] = ids.splice(0, 1);
    await database
      .update(proposalsTable)
      .set({ pastId: pastId })
      .where(sql`${proposalsTable.id} = ${ids.at(0)}`);
  }
}

function assertEvent<T>(eventNames: readonly T[], eventName: any): eventName is T {
  return eventNames.includes(eventName);
}
