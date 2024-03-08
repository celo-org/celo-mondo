import { governanceABI, lockedGoldABI } from '@celo/abis';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useProposalDequeue } from 'src/features/governance/hooks/useProposalQueue';
import { VoteAmounts, VoteType } from 'src/features/governance/types';
import { isNullish } from 'src/utils/typeof';
import { useReadContract } from 'wagmi';

export function useIsGovernanceVoting(address?: Address) {
  const { data, isError, isLoading, error } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'isVoting',
    args: [address || ZERO_ADDRESS],
    query: {
      enabled: !!address,
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  useToastError(error, 'Error fetching voting status');

  return {
    isVoting: data,
    isError,
    isLoading,
  };
}

export function useIsGovernanceUpVoting(address?: Address) {
  const { data, isError, isLoading, error } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getUpvoteRecord',
    args: [address || ZERO_ADDRESS],
    query: {
      enabled: !!address,
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  const { isUpvoting, upvoteRecord } = useMemo(() => {
    if (!data || !data[0]) return { isUpvoting: false, upvoteRecord: undefined };
    return {
      isUpvoting: true,
      upvoteRecord: {
        proposalId: Number(data[0]),
        upvotes: data[1],
      },
    };
  }, [data]);

  useToastError(error, 'Error fetching upvoting status');

  return {
    isUpvoting,
    upvoteRecord,
    isError,
    isLoading,
  };
}

export function useGovernanceVoteRecord(address?: Address, proposalId?: number) {
  const { dequeue } = useProposalDequeue();

  const proposalIndex = proposalId ? dequeue?.indexOf(proposalId) : undefined;

  // @ts-ignore TODO Bug with viem 2.0 types
  const { data, isError, isLoading, error, refetch } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getVoteRecord',
    args: [address || ZERO_ADDRESS, BigInt(proposalIndex || 0)],
    query: {
      enabled: address && !isNullish(proposalIndex),
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  useToastError(error, 'Error fetching voting record');

  const votingRecord: VoteAmounts | undefined = useMemo(() => {
    if (!data) return undefined;
    return {
      [VoteType.Yes]: data[3],
      [VoteType.No]: data[4],
      [VoteType.Abstain]: data[5],
    };
  }, [data]);

  return {
    votingRecord,
    isError,
    isLoading,
    refetch,
  };
}

export function useGovernanceVotingPower(address?: Address) {
  // @ts-ignore TODO Bug with viem 2.0 types
  const { data, isError, isLoading, error } = useReadContract({
    address: Addresses.LockedGold,
    abi: lockedGoldABI,
    functionName: 'getAccountTotalGovernanceVotingPower',
    args: [address || ZERO_ADDRESS],
    query: {
      enabled: !!address,
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  useToastError(error, 'Error fetching voting power');

  return {
    votingPower: data,
    isError,
    isLoading,
  };
}
