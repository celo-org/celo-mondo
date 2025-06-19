import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { TransactionLog } from 'src/features/explorers/types';
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
  // const topics = encodeEventTopics({
  //   abi: governanceABI,
  //   eventName: 'ProposalDequeued',
  // });
  // const approvalLogs = await queryCeloscanLogs(Addresses.Governance, `topic0=${topics[0]}`);
  const urlParams = new URLSearchParams();
  urlParams.append('eventName', 'ProposalDequeued');
  urlParams.append('chainId', '42220');

  const approvalLogs = await fetch(`/api/governance/events?${urlParams.toString()}`).then(
    (x) => x.json() as Promise<TransactionLog[]>,
  );

  const proposalIds: Array<number> = [];
  for (const log of approvalLogs) {
    const proposalId = decodeLog(log);
    if (!proposalId) continue;
    proposalIds.push(proposalId);
  }

  return proposalIds.sort((a, b) => a - b);
}

function decodeLog(log: TransactionLog) {
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
