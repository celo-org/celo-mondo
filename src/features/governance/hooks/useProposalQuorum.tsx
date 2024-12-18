import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { MergedProposalData } from 'src/features/governance/hooks/useGovernanceProposals';
import { Proposal } from 'src/features/governance/types';
import { fromFixidity } from 'src/utils/numbers';
import getRuntimeBlockNumber from 'src/utils/runtimeBlockNumber';
import { PublicClient } from 'viem';
import { usePublicClient, useReadContract } from 'wagmi';

interface ParticipationParameters {
  baseline: number;
  baselineFloor: number;
  baselineUpdateFactor: number;
  baselineQuorumFactor: number;
}

export function useProposalQuorum(propData?: MergedProposalData): {
  isLoading: boolean;
  data?: bigint;
} {
  const { isLoading: isLoadingParticipationParameters, data: participationParameters } =
    useParticipationParameters();
  const { isLoading: isLoadingThresholds, data: thresholds } = useThresholds(propData?.proposal);

  if (!propData || !propData.proposal || isLoadingParticipationParameters || isLoadingThresholds) {
    return { isLoading: true };
  }
  // https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Governance.sol#L1567
  const quorumPct = new BigNumber(participationParameters.baseline).times(
    participationParameters.baselineQuorumFactor,
  );
  // https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Proposals.sol#L195-L211
  const quorumVotes = BigInt(
    quorumPct.times(propData.proposal.networkWeight.toString()).toFixed(0),
  );
  const maxThreshold = Math.max(...thresholds!);
  return {
    data: BigInt(new BigNumber(quorumVotes.toString()).times(maxThreshold).toFixed(0)),
    isLoading: false,
  };
}

export function useParticipationParameters(): {
  isLoading: boolean;
  data: ParticipationParameters;
  error: Error | null;
} {
  const { data, isLoading, error } = useReadContract({
    blockNumber: getRuntimeBlockNumber(),
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getParticipationParameters',
    query: {
      gcTime: Infinity,
      staleTime: 60 * 60 * 1000, // 1 hour
    },
  });

  return {
    isLoading,
    data: {
      baseline: fromFixidity(data?.[0]),
      baselineFloor: fromFixidity(data?.[1]),
      baselineUpdateFactor: fromFixidity(data?.[2]),
      baselineQuorumFactor: fromFixidity(data?.[3]),
    },
    error,
  };
}

export function useThresholds(proposal?: Proposal): {
  isLoading: boolean;
  data?: number[];
  error: Error | null;
} {
  const publicClient = usePublicClient();
  const { error, isLoading, data } = useQuery({
    queryKey: ['useThresholds', publicClient, proposal?.id, Number(proposal!.numTransactions)],
    queryFn: async () => {
      return await fetchThresholds(publicClient!, proposal!.id, proposal!.numTransactions);
    },
    enabled: Boolean(publicClient && proposal?.id),
  });
  useToastError(error, 'Error fetching proposal quorum data');

  return {
    isLoading,
    data,
    error,
  };
}

export async function fetchThresholds(
  publicClient: PublicClient,
  proposalId: number,
  numTransactions: bigint,
) {
  const txIds = new Array(Number(numTransactions)).fill(0).map((_, id) => id);

  // Extracting the base contract call avoids the following error:
  // Type instantiation is excessively deep and possibly infinite. ts(2589)
  const getProposalTransactionContract = {
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getProposalTransaction',
  } as const;

  const results = await publicClient?.multicall({
    blockNumber: getRuntimeBlockNumber(),
    allowFailure: false,
    contracts: txIds.map((txId: number) => ({
      ...getProposalTransactionContract,
      args: [proposalId, txId],
    })),
  });

  if (!results) {
    return;
  }

  // Extracting the base contract call avoids the following error:
  // Type instantiation is excessively deep and possibly infinite. ts(2589)
  const getConstitutionContract = {
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getConstitution',
  } as const;

  const thresholds = await publicClient?.multicall({
    blockNumber: getRuntimeBlockNumber(),
    allowFailure: false,
    contracts: results.map(([_value, destination, data]) => {
      const functionId = extractFunctionSignature(data);
      return {
        ...getConstitutionContract,
        args: [destination, functionId],
      };
    }),
  });

  if (!thresholds) {
    return;
  }

  // https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Governance.sol#L1580-L1583
  return thresholds.map(fromFixidity);
}

/**
 *
 * @notice Extracts the first four bytes of a byte array.
 * https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/common/ExtractFunctionSignature.sol#L9
 */
export function extractFunctionSignature(input: `0x${string}`): `0x${string}` {
  const data = Buffer.from(input.replace('0x', ''), 'hex');
  return `0x${data.subarray(0, 4).toString('hex')}`;
}
