import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { queryCeloscanLogs } from 'src/features/explorers/celoscan';
import { TransactionLog } from 'src/features/explorers/types';
import { isValidAddress } from 'src/utils/addresses';
import { logger } from 'src/utils/logger';
import { objFilter } from 'src/utils/objects';
import { decodeEventLog, encodeEventTopics } from 'viem';

export function useProposalUpvoters(id?: number) {
  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useProposalUpvoters', id],
    queryFn: () => {
      if (!id) return null;
      logger.debug(`Fetching proposals upvoters for ${id}`);
      return fetchProposalUpvoters(id);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching proposals upvoters');

  return {
    isLoading,
    isError,
    upvoters: data || undefined,
    refetch,
  };
}

async function fetchProposalUpvoters(id: number): Promise<AddressTo<bigint>> {
  // Get encoded topics
  const upvoteTopics = encodeEventTopics({
    abi: governanceABI,
    eventName: 'ProposalUpvoted',
    args: { proposalId: BigInt(id) },
  });

  // Prep query URLs
  const upvoteParams = `topic0=${upvoteTopics[0]}&topic1=${upvoteTopics[1]}&topic0_1_opr=and`;
  const upvoteEvents = await queryCeloscanLogs(Addresses.Governance, upvoteParams);

  // Reduce logs to a map of voters to upvotes
  const voterToUpvotes: AddressTo<bigint> = {};
  reduceLogs(voterToUpvotes, upvoteEvents);

  // Filter out stakers who have already revoked all votes
  return objFilter(voterToUpvotes, (_, votes): votes is bigint => votes > 0n);
}

function reduceLogs(voterToUpvotes: AddressTo<bigint>, logs: TransactionLog[]) {
  for (const log of logs) {
    try {
      if (!log.topics || log.topics.length < 3) continue;
      const { eventName, args } = decodeEventLog({
        abi: governanceABI,
        data: log.data,
        topics: log.topics,
        strict: false,
      });

      if (eventName !== 'ProposalUpvoted') continue;

      const { account, upvotes } = args;
      if (!account || !isValidAddress(account) || !upvotes) continue;

      voterToUpvotes[account] ||= 0n;
      voterToUpvotes[account] += upvotes;
    } catch (error) {
      logger.warn('Error decoding event log', error, log);
    }
  }
}
