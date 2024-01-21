import { electionABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { GroupToStake } from 'src/features/staking/types';
import { logger } from 'src/utils/logger';
import { objKeys } from 'src/utils/objects';
import { MulticallReturnType, PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export const emptyStakeBalances = {
  active: 0n,
  pending: 0n,
  total: 0n,
};

export function useStakingBalances(address?: Address) {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useStakingBalances', publicClient, address],
    queryFn: async () => {
      if (!address) return null;
      logger.debug('Fetching staking balances');
      const groupToStake = await fetchStakingBalances(publicClient, address);
      const stakes = Object.values(groupToStake);
      const active = stakes.reduce((acc, stake) => acc + stake.active, 0n);
      const pending = stakes.reduce((acc, stake) => acc + stake.pending, 0n);
      const total = active + pending;
      const stakeBalances = { active, pending, total };
      return { groupToStake, stakeBalances };
    },
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  useToastError(error, 'Error fetching staking balances');

  return {
    isLoading,
    isError,
    groupToStake: data?.groupToStake,
    stakeBalances: data?.stakeBalances,
    refetch,
  };
}

export async function fetchStakingBalances(publicClient: PublicClient, address: Address) {
  const groupAddrs = await publicClient.readContract({
    address: Addresses.Election,
    abi: electionABI,
    functionName: 'getGroupsVotedForByAccount',
    args: [address],
  });

  if (!groupAddrs.length) return {};

  const groupAddrsAndAccount = groupAddrs.map((a) => [a, address]);

  // @ts-ignore Bug with viem 2.0 multicall types
  const pendingVotes: MulticallReturnType<any> = await publicClient.multicall({
    contracts: groupAddrsAndAccount.map(([g, a]) => ({
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'getPendingVotesForGroupByAccount',
      args: [g, a],
    })),
  });

  const activeVotes: MulticallReturnType<any> = await publicClient.multicall({
    contracts: groupAddrsAndAccount.map(([g, a]) => ({
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'getActiveVotesForGroupByAccount',
      args: [g, a],
    })),
  });

  const votes: GroupToStake = {};
  for (let i = 0; i < groupAddrs.length; i++) {
    const groupAddr = groupAddrs[i];
    const pending = pendingVotes[i];
    const active = activeVotes[i];
    if (pending.status !== 'success') throw new Error('Pending votes call failed');
    if (active.status !== 'success') throw new Error('Active votes call failed');
    votes[groupAddr] = {
      pending: pending.result as bigint,
      active: active.result as bigint,
      groupIndex: i,
    };
  }

  return votes;
}

export async function checkHasActivatable(
  publicClient: PublicClient,
  stakes: GroupToStake,
  address: Address,
) {
  const groupsWithPending = objKeys(stakes).filter((groupAddr) => stakes[groupAddr].pending > 0);
  if (!groupsWithPending.length) {
    return {
      status: false,
      groupAddresses: [],
    };
  }

  const groupAddrsAndAccount = groupsWithPending.map((a) => [address, a]);
  const hasActivatable = await publicClient.multicall({
    contracts: groupAddrsAndAccount.map(([g, a]) => ({
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'hasActivatablePendingVotes',
      args: [g, a],
    })),
  });

  const groupsToActivate = groupsWithPending.filter((v, i) => !!hasActivatable[i]);
  const status = groupsToActivate.length > 0;

  return {
    status,
    groupAddresses: groupsToActivate,
  };
}
