import { governanceABI, lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { config } from 'src/config/config';
import { StaleTime, ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useStCELOBalance, useVoteSignerToAccount } from 'src/features/account/hooks';
import { getStCeloProposalVotes } from 'src/features/governance/getStCELOProposalVotes';
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
      staleTime: StaleTime.Short,
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
      staleTime: StaleTime.Short,
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
  const account = useVoteSignerToAccount(address);

  const proposalIndex = proposalId ? dequeue?.indexOf(proposalId) : undefined;

  // Note, due to a bug in the contract, if a de-queued proposal is deleted,
  // the users's previous vote record could end up applied to a new proposal.
  // See https://github.com/celo-org/celo-monorepo/blob/release/core-contracts/10/packages/protocol/contracts/governance/Governance.sol#L742
  const { data, isError, isLoading, error, refetch } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getVoteRecord',
    args: [account.signingFor || address || ZERO_ADDRESS, BigInt(proposalIndex || 0)],
    query: {
      enabled: address && !isNullish(proposalIndex) && proposalIndex >= 0,
      staleTime: StaleTime.Short,
    },
  } as const);

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
  const { signingFor, isFetched } = useVoteSignerToAccount(address);
  const { data, isLoading, error } = useReadContract({
    address: Addresses.LockedGold,
    abi: lockedGoldABI,
    functionName: 'getAccountTotalGovernanceVotingPower',
    args: [signingFor ?? address ?? ZERO_ADDRESS],
    query: {
      enabled: isFetched,
      staleTime: StaleTime.Short,
    },
  } as const);

  useToastError(error, 'Error fetching voting power');

  // this is nessessary to fix a flash of content being render where loading is false and data is not yet populated
  if (isLoading || (data === undefined && !error)) {
    return {
      isLoading: true as const,
    };
  }

  return {
    votingPower: data ?? 0n,
    error,
    isLoading: false as const,
  };
}

export function useStCELOVotingPower(address?: Address) {
  const { stCELOBalances, isLoading, isError } = useStCELOBalance(address);

  return {
    stCeloVotingPower: stCELOBalances.total,
    isError,
    isLoading,
  };
}

export function useStCELOVoteRecord(address?: Address, proposalId?: number) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['getStCELOVoteRecord', address, proposalId],
    queryFn: async () => {
      return await getStCeloProposalVotes(config.chain.id, proposalId!, address!);
    },
    enabled: !!(address && proposalId),
  });

  return {
    stCELOVotingRecord: data,
    isError,
    isLoading,
    refetch,
  };
}
