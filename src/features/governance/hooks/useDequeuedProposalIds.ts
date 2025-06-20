import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { Event, fetchProposalEvents } from 'src/app/governance/events';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { decodeEventLog } from 'viem';

// Returns the list of proposal IDs that were dequeued and therefore were ready to receive votes
export function useDequeuedProposalIds() {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useApprovedProposalIds'],
    queryFn: () => {
      logger.debug(`Fetching approved proposal IDs`);
      return fetchDequeuedProposalIds();
    },
    gcTime: GCTime.Long,
    staleTime: StaleTime.Default,
  });

  useToastError(error, 'Error fetching proposal approval history');

  return {
    isLoading,
    isError,
    approvedProposals: data || undefined,
  };
}

async function fetchDequeuedProposalIds(): Promise<Array<number>> {
  const approvalLogs = await fetchProposalEvents(celoPublicClient.chain.id, 'ProposalDequeued');

  const proposalIds: Array<number> = [];
  for (const log of approvalLogs) {
    const proposalId = decodeLog(log);
    if (!proposalId) continue;
    proposalIds.push(proposalId);
  }

  return proposalIds.sort((a, b) => a - b);
}

function decodeLog(log: Event) {
  try {
    if (!log.topics || log.topics.length < 2) return null;
    const { eventName, args } = decodeEventLog({
      abi: governanceABI,
      data: log.data,
      topics: log.topics,
      strict: false,
    });
    if (eventName === 'ProposalDequeued') {
      return Number(args.proposalId);
    } else {
      logger.warn('Invalid event name, expected ProposalDequeued', eventName);
      return null;
    }
  } catch (error) {
    logger.warn('Error decoding approval event log', error, log);
    return null;
  }
}
