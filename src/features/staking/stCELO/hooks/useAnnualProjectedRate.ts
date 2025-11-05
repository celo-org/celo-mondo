import { epochRewardsABI } from '@celo/abis';
import { useContractAddress } from 'src/config/contracts';
import { fromFixidity } from 'src/utils/numbers';
import { useReadContract } from 'wagmi';

export const useAnnualProjectedRate = (): {
  annualProjectedRate: number | undefined;
  isLoading: boolean;
} => {
  const epochRewardsAddress = useContractAddress('EpochRewards');
  const { data: rewardsMultiplierFraction, isLoading: multiplierLoading } = useReadContract({
    abi: epochRewardsABI,
    address: epochRewardsAddress,
    functionName: 'getRewardsMultiplier',
  });
  const { data: targetVotingYieldParameters, isLoading: yieldParamsLoading } = useReadContract({
    abi: epochRewardsABI,
    address: epochRewardsAddress,
    functionName: 'getTargetVotingYieldParameters',
  });

  if (multiplierLoading || yieldParamsLoading || !epochRewardsAddress) {
    return {
      annualProjectedRate: undefined,
      isLoading: true,
    };
  }

  const targetVotingYield = fromFixidity(targetVotingYieldParameters![0]);
  const rewardsMultiplier = fromFixidity(rewardsMultiplierFraction!);

  // Target voting yield is for a single day only, so we have to calculate this for entire year
  const unadjustedAPR = targetVotingYield * 365;
  // According to the protocol it has to be adjusted by rewards multiplier
  const adjustedAPR = unadjustedAPR * rewardsMultiplier;

  return {
    annualProjectedRate: adjustedAPR * 100,
    isLoading: false,
  };
};
