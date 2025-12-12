import { useCallback } from 'react';
import ManagerABI from 'src/config/stcelo/ManagerABI';
import { useReadContract } from 'wagmi';

const WEI_PER_UNIT = 1000000000000000000n;
const precision = 10_000n;

export const useExchangeRates = () => {
  const {
    stakingRate,
    refetch: loadStakingRate,
    isLoading: isLoadingStakingRate,
  } = useStakingRate();
  const {
    unstakingRate,
    refetch: loadUnstakingRate,
    isLoading: isLoadingUnstakingRate,
  } = useUnstakingRate();

  const refetch = useCallback(async () => {
    await Promise.all([loadStakingRate(), loadUnstakingRate()]);
  }, [loadStakingRate, loadUnstakingRate]);

  return {
    stakingRate,
    unstakingRate,
    refetch,
    isLoading: isLoadingStakingRate || isLoadingUnstakingRate,
  };
};

const useStakingRate = () => {
  const { data, refetch, isLoading } = useReadContract({
    ...ManagerABI,
    functionName: 'toStakedCelo',
    args: [WEI_PER_UNIT * precision],
    query: {
      select: (rate) => Number(rate / WEI_PER_UNIT) / Number(precision),
    },
  });

  return {
    stakingRate: data,
    refetch,
    isLoading,
  };
};

const useUnstakingRate = () => {
  const { data, refetch, isLoading } = useReadContract({
    ...ManagerABI,
    functionName: 'toCelo',
    args: [WEI_PER_UNIT * precision],
    query: {
      select: (rate) => Number(rate / WEI_PER_UNIT) / Number(precision),
    },
  });

  return {
    unstakingRate: data,
    refetch,
    isLoading,
  };
};
