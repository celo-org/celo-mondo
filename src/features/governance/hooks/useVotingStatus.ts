import { governanceABI, lockedGoldABI } from '@celo/abis';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { StaleTime, ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import VoteABI from 'src/config/stcelo/VoteABI';
import { useVoteSignerToAccount } from 'src/features/account/hooks';
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
  const { data, isError, isLoading, error } = useReadContract({
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

  return {
    votingPower: data,
    isError,
    isLoading,
  };
}

export function useStCELOVotingPower(address?: Address) {
  const { data, isError, isLoading, error } = useReadContract({
    ...VoteABI,
    functionName: 'getVoteWeight',
    args: [address!],
    query: {
      enabled: !!address,
    },
  } as const);

  useToastError(error, 'Error fetching stcelo voting power');

  return {
    stCeloVotingPower: data,
    isError,
    isLoading,
  };
}

export function useStCELOVoteRecord(address?: Address, proposalId?: number) {
  const { dequeue } = useProposalDequeue();
  const proposalIndex = proposalId ? dequeue?.indexOf(proposalId) : undefined;

  const { data, isError, isLoading, error, refetch } = useReadContract({
    ...VoteABI,
    functionName: 'getVoteRecord',
    args: [BigInt(proposalIndex || 0)],
    query: {
      enabled: address && !isNullish(proposalIndex) && proposalIndex >= 0,
      staleTime: StaleTime.Short,
    },
  });

  const { data: xyz } = useReadContract({
    ...VoteABI,
    functionName: 'getVotedStillRelevantProposals',
    args: [address!],
    query: {
      enabled: !!address,
    },
  });

  console.log({ xyz });

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
