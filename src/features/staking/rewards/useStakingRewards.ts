import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { computeStakingRewards } from 'src/features/staking/rewards/computeRewards';
import { fetchStakeEvents } from 'src/features/staking/rewards/fetchStakeHistory';
import { GroupVotes } from 'src/features/staking/types';
import { logger } from 'src/utils/logger';

export function useStakingRewards(address?: Address, groupVotes?: GroupVotes) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useStakingRewards', address, groupVotes],
    queryFn: async () => {
      if (!address || !groupVotes) return null;
      logger.debug('Fetching staking rewards');
      const events = await fetchStakeEvents(address);
      const rewards = computeStakingRewards(events, groupVotes, 'amount');
      const totalRewards = Object.values(rewards).reduce((acc, r) => acc + r, 0);
      return { events, rewards, totalRewards };
    },
    gcTime: Infinity,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useToastError(error, 'Error fetching staking rewards');

  return {
    isLoading,
    isError,
    events: data?.events,
    rewards: data?.rewards,
    totalRewards: data?.totalRewards,
  };
}
