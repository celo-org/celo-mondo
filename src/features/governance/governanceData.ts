import { governanceABI } from '@celo/abis';
import { fetchProposalEvents } from 'src/app/governance/events';
import {
  APPROVAL_STAGE_EXPIRY_TIME,
  EXECUTION_STAGE_EXPIRY_TIME,
  QUEUED_STAGE_EXPIRY_TIME,
  REFERENDUM_STAGE_EXPIRY_TIME,
} from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import CachedMetadata from 'src/config/proposals.json';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import {
  ACTIVE_PROPOSAL_STAGES,
  Proposal,
  ProposalMetadata,
  ProposalStage,
  VoteType,
} from 'src/features/governance/types';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import getRuntimeBlock from 'src/utils/runtimeBlock';
import { PublicClient } from 'viem';

export const collectProposals = async (publicClient: PublicClient) => {
  const [proposals, metadata, executedIds] = await Promise.all([
    fetchGovernanceProposals(publicClient),
    fetchGovernanceMetadata(),
    fetchExecutedProposalIds(),
  ]);
  // Then merge it with the cached
  return mergeProposalsWithMetadata(proposals, metadata, executedIds);
};

const ID_PARAM_REGEX = /^(cgp-)?(\d+)$/;

export function findProposal(proposals: MergedProposalData[] | undefined, id: string) {
  if (!proposals || !id) return undefined;
  const matches = new RegExp(ID_PARAM_REGEX).exec(id);
  if (matches?.[1] === 'cgp-') {
    const cgpId = parseInt(matches[2]);
    return proposals.find((p) => p.metadata?.cgp === cgpId);
  } else if (matches?.[2]) {
    const propId = parseInt(matches[2]);
    return proposals.find((p) => p.proposal?.id === propId);
  } else {
    return undefined;
  }
}
export type MergedProposalData = { stage: ProposalStage; id?: number } & (
  | { proposal: Proposal; metadata?: ProposalMetadata; history?: undefined }
  | { proposal?: Proposal; metadata: ProposalMetadata; history?: undefined }
  | { proposal: Proposal; metadata: ProposalMetadata; history?: number[] }
);
export const CGP_REGEX = /cgp-(\d+)/;

export async function fetchGovernanceProposals(publicClient: PublicClient): Promise<Proposal[]> {
  // Get queued and dequeued proposals
  const [queued, dequeued] = await publicClient.multicall({
    ...getRuntimeBlock(),
    contracts: [
      {
        address: Addresses.Governance,
        abi: governanceABI,
        functionName: 'getQueue',
      } as const,
      {
        address: Addresses.Governance,
        abi: governanceABI,
        functionName: 'getDequeue',
      } as const,
    ],
  });

  if (queued.status !== 'success' || dequeued.status !== 'success') {
    throw new Error('Error fetching proposal IDs');
  }

  const [queuedIds, queuedUpvotes] = queued.result;
  // Filter out queues with id of 0, not sure why they are included
  const dequeuedIds = dequeued.result.filter((id: bigint) => !!id);
  const allIdsAndUpvotes = [
    ...queuedIds.map((id, i) => ({ id, upvotes: queuedUpvotes[i] })),
    ...dequeuedIds.map((id) => ({ id, upvotes: 0n })),
  ].filter((p) => p.id !== 0n);

  if (!allIdsAndUpvotes.length) return [];

  const properties = await publicClient.multicall({
    ...getRuntimeBlock(),
    contracts: allIdsAndUpvotes.map(
      (p) =>
        ({
          address: Addresses.Governance,
          abi: governanceABI,
          functionName: 'getProposal',
          args: [p.id],
        }) as const,
    ),
  });

  const stages = await publicClient.multicall({
    ...getRuntimeBlock(),
    contracts: allIdsAndUpvotes.map(
      (p) =>
        ({
          address: Addresses.Governance,
          abi: governanceABI,
          functionName: 'getProposalStage',
          args: [p.id],
        }) as const,
    ),
  });

  const votes = await publicClient.multicall({
    ...getRuntimeBlock(),
    contracts: allIdsAndUpvotes.map(
      (p) =>
        ({
          address: Addresses.Governance,
          abi: governanceABI,
          functionName: 'getVoteTotals',
          args: [p.id],
        }) as const,
    ),
  });

  const proposals: Proposal[] = [];
  for (let i = 0; i < allIdsAndUpvotes.length; i++) {
    const { id, upvotes } = allIdsAndUpvotes[i];
    const props = properties[i];
    const proposalStage = stages[i];
    const vote = votes[i];

    if (!props.result || !proposalStage.result || !vote.result) {
      logger.warn('Missing proposal metadata, stage, or vote totals for ID', id);
      continue;
    }

    const [proposer, deposit, timestampSec, numTransactions, url, networkWeight, isApproved] =
      props.result as ProposalRaw;

    const [yes, no, abstain] = vote.result as VoteTotalsRaw;
    const stage = proposalStage.result as ProposalStage;
    const timestamp = Number(timestampSec) * 1000;
    const expiryTimestamp = getExpiryTimestamp(stage, timestamp);

    proposals.push({
      id: Number(id),
      stage,
      timestamp,
      expiryTimestamp,
      proposer,
      deposit,
      numTransactions,
      networkWeight,
      isApproved,
      url,
      upvotes,
      votes: {
        [VoteType.Yes]: yes,
        [VoteType.No]: no,
        [VoteType.Abstain]: abstain,
      },
    });
  }

  return proposals;
} // The governance metadata is often left unchanged after a proposal is executed
// so this query is used to double-check the status of proposals

export async function fetchExecutedProposalIds(): Promise<number[]> {
  const events = await fetchProposalEvents(celoPublicClient.chain.id, 'ProposalExecuted');
  return events.map((e) => parseInt(e.topics[1], 16));
}

/*
 * merges onchain data with metadata
 * @param proposals - onchain proposals
 * @param metadata - metadata from the repo
 * @param executedIds - list of executed proposal IDs
 * @returns merged proposals
 */

export function mergeProposalsWithMetadata(
  proposals: Proposal[],
  metadata: ProposalMetadata[],
  executedIds: number[],
): MergedProposalData[] {
  const sortedProposals = [...proposals].sort((a, b) => b.id - a.id);
  const sortedMetadata = [...metadata].sort((a, b) => b.cgp - a.cgp);
  const merged: MergedProposalData[] = [];
  const proposalMap = new Map(sortedProposals.map((p) => [p.id, p]));

  // One day deduping proposals first will might be a better approach
  for (const proposal of sortedProposals) {
    // First, try to match using the proposal ID
    let metadataIndex = sortedMetadata.findIndex((m) => m.id === proposal.id);
    // If no match was found, try to match using the discussion url
    // which is sometimes set to the CGP URL
    if (metadataIndex < 0 && proposal.url) {
      const cgpString = CGP_REGEX.exec(proposal.url)?.[1];
      if (cgpString) {
        const cgpNumber = parseInt(cgpString, 10);
        metadataIndex = sortedMetadata.findIndex((m) => m.cgp === cgpNumber);
      }
    }

    if (metadataIndex >= 0) {
      // Remove the metadata element
      const metadata = sortedMetadata.splice(metadataIndex, 1)[0];

      if (metadata.id && metadata.id !== proposal.id) {
        merged.push(
          pessimisticallyHandleMismatchedIDs(executedIds, metadata, proposal, proposalMap),
        );
      } else {
        // happy normal case
        // Add it to the merged array, giving priority to on-chain stage
        merged.push({ stage: proposal.stage, id: proposal.id, proposal, metadata });
      }
    } else {
      // No metadata found, use just the on-chain data
      merged.push({ stage: proposal.stage, id: proposal.id, proposal });
    }
  }
  // Merge in any remaining metadata, cleaning it first
  // this is where DRAFTS will come from for example
  for (const metadata of sortedMetadata) {
    if (metadata.id && executedIds.includes(metadata.id)) {
      metadata.stage = ProposalStage.Executed;
    } else if (metadata.stage === ProposalStage.Queued) {
      if (metadata.id) {
        // Any proposals marked 'PROPOSED' (aka queued) in the metadata but
        // not found on-chain are likely expired.
        metadata.stage = ProposalStage.Expiration;
      } else {
        // If there's no ID, it's a draft and the metadata is incorrect
        metadata.stage = ProposalStage.None;
      }
    }
    merged.push({ stage: metadata.stage, id: metadata.id, metadata });
  }

  return (
    merged
      // Filter out failed proposals without a corresponding CGP
      .filter((p) => p.metadata?.cgp || p.proposal?.stage !== ProposalStage.Expiration)
      // Sort by active proposals then by CGP number
      .sort((a, b) => {
        if (isActive(b) && !isActive(a)) return 1;
        if (isActive(a) && !isActive(b)) return -1;
        if (a.metadata && b.metadata) return b.metadata.cgp - a.metadata.cgp;
        if (b.metadata) return 1;
        if (a.metadata) return -1;
        return 0;
      })
  );
}
/*
    situation. there were 2 proposals for the same cgp.
    one was a mistake, the other was executed.
    the mistake proposal will remain onchain while the metadata from gh will point to the correct one

    reasons it could be resubmitted onchain
       a mistake was found
          before upvoting
          during voting
          after upvoting

        the proposals failed to recieve sufficient votes
        the proposal passed but was not approved or executed
   
        in all cases the higher id Should be the correct one

        unless if was just a mistake (but if it points to the same cgp then it is not a mistake)
    */

export function pessimisticallyHandleMismatchedIDs(
  executedIds: number[],
  metadata: ProposalMetadata,
  proposal: Proposal,
  proposalMap: Map<number, Proposal>,
): MergedProposalData {
  if (executedIds.includes(metadata.id!)) {
    // the proposal is WRONG, trust the metadata
    // do NOT use votes from the proposal they are wrong
    return {
      stage: ProposalStage.Executed,
      id: metadata.id,
      metadata: { ...metadata, votes: undefined },
      proposal: proposalMap.get(metadata.id!)!,
      history: [proposal.id],
    };
  } else if (executedIds.includes(proposal.id)) {
    // the proposal was executed so it is correct
    return {
      stage: ProposalStage.Executed,
      id: proposal.id,
      proposal,
      metadata: { ...metadata, id: proposal.id },
      history: metadata.id ? [metadata.id] : undefined,
    };
  } else if (
    proposal.stage === ProposalStage.Expiration &&
    (metadata.stage === ProposalStage.Rejected || metadata.stage === ProposalStage.Withdrawn)
  ) {
    return {
      stage: metadata.stage,
      id: metadata.id,
      proposal,
      metadata,
      history: metadata.id ? [metadata.id] : undefined,
    };
  } else {
    const metaDataId = typeof metadata.id === 'number' ? metadata.id : 0;
    const probableID = Math.max(metaDataId, proposal.id);
    const historicId = Math.min(metaDataId, proposal.id);

    const probableStage = probableID === metadata.id ? metadata.stage : proposal.stage;

    const metaData = { ...metadata, id: probableID, stage: probableStage };

    // what would cause this
    // none like this currently show. but if they do they should be handled
    return {
      stage: probableStage,
      id: probableID,
      metadata: metaData,
      proposal: proposalMap.get(probableID)!,
      history: historicId ? [historicId] : undefined,
    };
  }
}
function isActive(p: MergedProposalData) {
  return ACTIVE_PROPOSAL_STAGES.includes(p.stage);
}

export function fetchGovernanceMetadata(): Promise<ProposalMetadata[]> {
  // Fetching every past proposal would take too long so the app
  // fetches them at build time and stores a cache. To keep this
  // hook fast, the app should be re-built every now and then.
  const cached = CachedMetadata as ProposalMetadata[];
  return fetchProposalsFromRepo(cached, false);
}

export function getExpiryTimestamp(stage: ProposalStage, timestamp: number) {
  if (stage === ProposalStage.Queued) {
    return timestamp + QUEUED_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Approval) {
    return timestamp + APPROVAL_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Referendum) {
    return timestamp + REFERENDUM_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Execution) {
    return timestamp + REFERENDUM_STAGE_EXPIRY_TIME + EXECUTION_STAGE_EXPIRY_TIME;
  } else {
    return undefined;
  }
} // proposer, deposit, timestamp, numTransactions, url, networkWeight, isApproved

export type ProposalRaw = [Address, bigint, bigint, bigint, string, bigint, boolean];
// Yes, no, abstain
export type VoteTotalsRaw = [bigint, bigint, bigint];
