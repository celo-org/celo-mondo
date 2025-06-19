import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { fetchProposalEvents } from 'src/app/governance/events';
import { useToastError } from 'src/components/notifications/useToastError';
import { isValidAddress } from 'src/utils/addresses';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { objFilter } from 'src/utils/objects';
import { decodeEventLog } from 'viem';

export function useProposalUpvoters(id?: number) {
  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useProposalUpvoters', id],
    queryFn: () => {
      if (!id) return null;
      logger.debug(`Fetching proposals upvoters for ${id}`);
      return fetchProposalUpvoters(id);
    },
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
  const upvoteEvents = await fetchProposalEvents(
    celoPublicClient.chain.id,
    'ProposalUpvoted',
    BigInt(id),
  );

  // Reduce logs to a map of voters to upvotes
  const voterToUpvotes: AddressTo<bigint> = {};
  reduceLogs(voterToUpvotes, upvoteEvents);

  // Filter out stakers who have already revoked all votes
  return objFilter(voterToUpvotes, (_, votes): votes is bigint => votes > 0n);
}

function reduceLogs(
  voterToUpvotes: AddressTo<bigint>,
  logs: Awaited<ReturnType<typeof fetchProposalEvents>>,
) {
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
