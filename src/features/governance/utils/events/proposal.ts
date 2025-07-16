import 'server-only';

import { governanceABI } from '@celo/abis';
import { Event } from 'src/app/governance/events';
import { Addresses } from 'src/config/contracts';
import { proposalsTable } from 'src/db/schema';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { ProposalMetadata, ProposalStage } from 'src/features/governance/types';
import { Chain, decodeEventLog, PublicClient, Transport } from 'viem';

const ALLOWED_EVENTS = [
  'ProposalExecuted',
  'ProposalApproved',
  'ProposalExpired',
  'ProposalDequeued',
  'ProposalQueued',
] as const;
export async function handleProposalEvent(
  eventName: string,
  event: Event,
  eventInputs: {
    name: string;
    type: string;
    value: string;
  }[],
  client: PublicClient<Transport, Chain>,
): Promise<(typeof proposalsTable)['$inferInsert'] | null> {
  if (!assertEvent(ALLOWED_EVENTS, eventName)) {
    console.info('Not a proposal event');
    return null;
  }

  const { topics, data } = event;
  const {
    args: { proposalId },
  } = decodeEventLog({
    abi: governanceABI,
    topics,
    data,
    eventName,
  });
  if (!proposalId) {
    throw new Error('Couldnt decode the proposal event: ' + JSON.stringify(event));
  }

  const cached = (await import('src/config/proposals.json')).default as ProposalMetadata[];
  const proposalsMetadata = await fetchProposalsFromRepo(cached, false);

  let stage: ProposalStage;
  switch (eventName) {
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
  }

  const blockchainStage = await client.readContract({
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

  const blockchainProposal = await client.readContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getProposal',
    args: [proposalId],
  });
  const url = blockchainProposal[4];
  const networkWeight = blockchainProposal[5];
  const cgpMatch = url?.match(/cgp-(\d+)\.md/);

  const metadata = proposalsMetadata.find(
    ({ id, cgp }) =>
      (id || -1) === Number(proposalId) || cgp === parseInt(cgpMatch?.[1] || '0', 10),
  );

  if (!metadata) {
    // TODO: can we recover?
    throw new Error(
      `-metadata not found for ${JSON.stringify({ proposalId, cgp: cgpMatch?.[1] })}`,
    );
  }

  const createdAt =
    eventName === 'ProposalQueued'
      ? parseInt(eventInputs.find((x) => x.name == 'timestamp')!.value!, 10)
      : 0; // createdAt will only be inserted if raw doesnt exist yet
  const proposer =
    eventName === 'ProposalQueued' ? eventInputs.find((x) => x.name == 'proposer')!.value! : ''; // proposer will only be inserted if raw doesnt exist yet
  const deposit =
    eventName === 'ProposalQueued'
      ? BigInt(eventInputs.find((x) => x.name == 'deposit')!.value!)
      : 0n; // deposit will only be inserted if raw doesnt exist yet
  const transactionCount =
    eventName === 'ProposalQueued'
      ? parseInt(eventInputs.find((x) => x.name == 'transactionCount')!.value!, 10)
      : 0; // transactionCount will only be inserted if raw doesnt exist yet

  return {
    id: Number(proposalId),
    chainId: client.chain.id,
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
    networkWeight,
    executedAt: metadata.timestampExecuted ? metadata.timestampExecuted / 1000 : null,
    transactionCount,
  };
}

function assertEvent<T>(eventNames: readonly T[], eventName: any): eventName is T {
  return eventNames.includes(eventName);
}
