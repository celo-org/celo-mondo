/* eslint-disable no-console */
import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { useProposalVoteTotals } from 'src/features/governance/hooks/useProposalVoteTotals';
import { Proposal, VoteAmounts, VoteType } from 'src/features/governance/types';
import type { ProposalTransaction } from 'src/features/governance/utils/transactionDecoder';
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

export function calculateQuorum({
  participationParameters,
  networkWeight,
  thresholds,
}: {
  participationParameters: ParticipationParameters;
  networkWeight: bigint;
  thresholds: number[];
}) {
  const quorumPct = new BigNumber(participationParameters.baseline).times(
    participationParameters.baselineQuorumFactor,
  );
  // https://github.com/celo-org/celo-monorepo/blob/a60152ba4ed8218a36ec80fdf4774b77d253bbb6/packages/protocol/contracts/governance/Governance.sol#L1734-L1746
  const quorumVotes = BigInt(quorumPct.times(networkWeight.toString()).toFixed(0));
  const maxThreshold = Math.max(...thresholds!);
  return BigInt(new BigNumber(quorumVotes.toString()).times(maxThreshold).toFixed(0));
}

export function parseParticipationParameters(
  data: readonly [bigint, bigint, bigint, bigint],
): ParticipationParameters {
  return {
    baseline: fromFixidity(data[0]),
    baselineFloor: fromFixidity(data[1]),
    baselineUpdateFactor: fromFixidity(data[2]),
    baselineQuorumFactor: fromFixidity(data[3]),
  };
}

type UseProposalQuorumReturnType =
  | { isLoading: true; data?: never }
  | { isLoading: false; data: bigint };
export function useProposalQuorum(propData?: MergedProposalData): UseProposalQuorumReturnType {
  const shouldFetch = !propData?.quorumVotesRequired;
  const { isLoading: isLoadingParticipationParameters, data: participationParameters } =
    useParticipationParameters(shouldFetch);
  const { isLoading: isLoadingThresholds, data: thresholds } = useThresholds(
    propData?.proposal,
    shouldFetch,
  );
  if (!propData || !propData.proposal || isLoadingParticipationParameters || isLoadingThresholds) {
    return { isLoading: true };
  }

  if (propData.quorumVotesRequired) {
    return {
      isLoading: false,
      data: propData.quorumVotesRequired,
    };
  }

  try {
    return {
      data: calculateQuorum({
        participationParameters: participationParameters!,
        networkWeight: propData.proposal.networkWeight,
        thresholds: thresholds!,
      }),
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

export function isProposalPassingQuorum({
  votes,
  quorumVotesRequired,
}: {
  votes: VoteAmounts;
  quorumVotesRequired: bigint;
}) {
  const yesVotes = votes?.[VoteType.Yes] || 0n;
  const abstainVotes = votes?.[VoteType.Abstain] || 0n;
  const quorumMeetingVotes = yesVotes + abstainVotes;

  const quorumMetByVoteCount = quorumVotesRequired
    ? quorumMeetingVotes > quorumVotesRequired
    : false;

  return quorumMetByVoteCount;
}

export function useIsProposalPassingQuorum(propData?: MergedProposalData): {
  isLoading: boolean;
  quorumMet: boolean;
  quorumVotesRequired?: bigint;
} {
  const { isLoading: isVotesLoading, votes } = useProposalVoteTotals(propData);
  const { isLoading, data: quorumVotesRequired } = useProposalQuorum(propData);

  if (isVotesLoading || isLoading) {
    return {
      isLoading: true,
      quorumMet: false,
    };
  }

  return {
    isLoading: isLoading,
    quorumMet: isProposalPassingQuorum({
      votes: votes!,
      quorumVotesRequired,
    }),
    quorumVotesRequired,
  };
}

export function useParticipationParameters(enabled: boolean): {
  isLoading: boolean;
  data: ParticipationParameters | undefined;
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
      enabled,
    },
  });

  return {
    isLoading,
    data: data ? parseParticipationParameters(data) : undefined,
    error,
  };
}

export function useThresholds(
  proposal: Proposal | undefined,
  enabled: boolean,
): {
  isLoading: boolean;
  data?: number[];
  error: Error | null;
} {
  const publicClient = usePublicClient();
  const { error, isLoading, data } = useQuery({
    queryKey: ['useThresholds', publicClient, proposal?.id],
    queryFn: async () => {
      return await fetchThresholds(publicClient!, proposal!.id);
    },
    enabled: enabled && Boolean(publicClient && proposal?.id),
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
  proposalTransactions?: ProposalTransaction[],
) {
  if (!proposalTransactions) {
    const response = await fetch(`/governance/${proposalId}/api/transactions?decoded=false`);
    proposalTransactions = (await response.json()) as ProposalTransaction[];
  }

  if (proposalTransactions.length === 0) {
    // https://github.com/celo-org/celo-monorepo/blob/a60152ba4ed8218a36ec80fdf4774b77d253bbb6/packages/protocol/contracts/governance/Governance.sol#L1730
    proposalTransactions.push({
      to: '0x0000000000000000000000000000000000000000',
      data: '0x00000000',
      value: 0n,
      index: 0,
    });
  }
  // Extracting the base contract call avoids the following error:
  // Type instantiation is excessively deep and possibly infinite. ts(2589)
  const getConstitutionContract = {
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getConstitution',
  } as const;

  const thresholds = await publicClient?.multicall({
    ...getRuntimeBlock(), // This is probably fine most of the time but in case thresholds change better to run against block from when proposal was in referendum.
    allowFailure: false,
    contracts: proposalTransactions.map(({ data, to: destination }) => {
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
