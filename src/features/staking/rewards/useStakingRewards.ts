import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { computeStakingRewards } from 'src/features/staking/rewards/computeRewards';
import { fetchStakeEvents } from 'src/features/staking/rewards/fetchStakeHistory';
import { GroupToStake } from 'src/features/staking/types';
import { toWei } from 'src/utils/amount';
import { logger } from 'src/utils/logger';

export function useStakingRewards(address?: Address, stakes?: GroupToStake) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useStakingRewards', address, stakes],
    queryFn: async () => {
      if (!address || !stakes) return null;
      logger.debug('Fetching staking rewards');
      const events = await fetchStakeEvents(address);
      const groupToReward = computeStakingRewards(events, stakes, 'amount');
      const totalRewards = Object.values(groupToReward).reduce((acc, r) => acc + r, 0);
      const totalRewardsWei = toWei(totalRewards);
      return { events, groupToReward, totalRewards, totalRewardsWei };
    },
    gcTime: Infinity,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useToastError(error, 'Error fetching staking rewards');

  return {
    isLoading,
    isError,
    events: data?.events,
    groupToReward: data?.groupToReward,
    totalRewards: data?.totalRewards,
    totalRewardsWei: data?.totalRewardsWei,
  };
}
