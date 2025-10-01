/* eslint-disable no-console */
import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { Proposal } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { fromFixidity } from 'src/utils/numbers';
import getRuntimeBlock from 'src/utils/runtimeBlock';
import { PublicClient, fromHex, toHex } from 'viem';
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
  try {
    // https://github.com/celo-org/celo-monorepo/blob/a60152ba4ed8218a36ec80fdf4774b77d253bbb6/packages/protocol/contracts/governance/Governance.sol#L1724-L1726
    const quorumPct = new BigNumber(participationParameters.baseline).times(
      participationParameters.baselineQuorumFactor,
    );
    // https://github.com/celo-org/celo-monorepo/blob/a60152ba4ed8218a36ec80fdf4774b77d253bbb6/packages/protocol/contracts/governance/Governance.sol#L1734-L1746
    const quorumVotes = BigInt(
      quorumPct.times(propData.proposal.networkWeight.toString()).toFixed(0),
    );
    const maxThreshold = Math.max(...thresholds!);
    return {
      data: BigInt(new BigNumber(quorumVotes.toString()).times(maxThreshold).toFixed(0)),
      isLoading: false,
    };
  } catch (error) {
    logger.warn(
      'Error calculating proposal quorum',
      'thresholds',
      thresholds,
      'networkWeight',
      propData.proposal.networkWeight.toString(),
      error,
    );
    return {
      isLoading: false,
      data: BigInt(0),
    };
  }
}

export function useIsProposalPassing(id: number | undefined) {
  return useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    args: [id ? BigInt(id) : 0n],
    functionName: 'isProposalPassing',
    scopeKey: `useIsProposalPassing-${id}`,
    query: {
      enabled: Boolean(id),
      gcTime: GCTime.Shortest,
      staleTime: StaleTime.Shortest,
    },
  });
}

export function useParticipationParameters(): {
  isLoading: boolean;
  data: ParticipationParameters;
  error: Error | null;
} {
  const { data, isLoading, error } = useReadContract({
    ...getRuntimeBlock(),
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getParticipationParameters',
    query: {
      gcTime: GCTime.Default,
      staleTime: StaleTime.Default,
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
    ...getRuntimeBlock(),
    allowFailure: false,
    contracts: txIds.map((txId: number) => ({
      ...getProposalTransactionContract,
      args: [proposalId, txId],
    })),
  });

  // Extracting the base contract call avoids the following error:
  // Type instantiation is excessively deep and possibly infinite. ts(2589)
  const getConstitutionContract = {
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getConstitution',
  } as const;

  if (results.length === 0) {
    // https://github.com/celo-org/celo-monorepo/blob/a60152ba4ed8218a36ec80fdf4774b77d253bbb6/packages/protocol/contracts/governance/Governance.sol#L1730
    results.push([0n, '0x0000000000000000000000000000000000000000', '0x00000000']);
  }

  const thresholds = await publicClient?.multicall({
    ...getRuntimeBlock(),
    allowFailure: false,
    contracts: results.map(([_value, destination, data]) => {
      const functionId = extractFunctionSignature(data);
      return {
        ...getConstitutionContract,
        args: [destination, functionId],
      };
    }),
  });

  // https://github.com/celo-org/celo-monorepo/blob/a60152ba4ed8218a36ec80fdf4774b77d253bbb6/packages/protocol/contracts/governance/Governance.sol#L1738-L1741
  return thresholds.map(fromFixidity);
}

/**
 *
 * @notice Extracts the first four bytes of a byte array.
 * https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/common/ExtractFunctionSignature.sol#L9
 */
export function extractFunctionSignature(input: `0x${string}`): `0x${string}` {
  if (!input.startsWith('0x')) input = `0x${input}`;
  const data = fromHex(input, { to: 'bytes' });
  return toHex(data.subarray(0, 4));
}
