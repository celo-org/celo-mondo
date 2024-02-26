import { governanceABI } from '@celo/abis';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { Addresses } from 'src/config/contracts';
import { MergedProposalData } from 'src/features/governance/hooks/useGovernanceProposals';
import { fromFixidity } from 'src/utils/numbers';
import { useReadContract } from 'wagmi';

interface ParticipationParameters {
  baseline: number;
  baselineFloor: number;
  baselineUpdateFactor: number;
  baselineQuorumFactor: number;
}

export function useProposalQuorum(propData?: MergedProposalData) {
  const participationParameters = useParticipationParameters();

  if (!propData?.proposal?.networkWeight) return undefined;

  return BigInt(
    BigNumber(propData.proposal.networkWeight.toString())
      .times(participationParameters.baseline)
      .times(participationParameters.baselineQuorumFactor)
      .toFixed(0),
  );
}

function useParticipationParameters(): ParticipationParameters {
  const { data } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getParticipationParameters',
    query: {
      gcTime: Infinity,
      staleTime: 60 * 60 * 1000, // 1 hour
    },
  });

  return useMemo(
    () => ({
      baseline: fromFixidity(data?.[0]),
      baselineFloor: fromFixidity(data?.[1]),
      baselineUpdateFactor: fromFixidity(data?.[2]),
      baselineQuorumFactor: fromFixidity(data?.[3]),
    }),
    [data],
  );
}
