import { electionABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { StakingBalances } from 'src/features/staking/types';
import { logger } from 'src/utils/logger';
import { objKeys } from 'src/utils/objects';
import { PublicClient, usePublicClient } from 'wagmi';

export function useStakingBalances(address?: Address) {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useStakingBalances', publicClient, address],
    queryFn: () => {
      if (!address) return null;
      logger.debug('Fetching staking balances');
      return fetchStakingBalances(publicClient, address);
    },
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  useToastError(error, 'Error fetching staking balances');

  return {
    isLoading,
    isError,
    stakes: data || undefined,
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

  const pendingVotes = await publicClient.multicall({
    contracts: groupAddrsAndAccount.map(([g, a]) => ({
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'getPendingVotesForGroupByAccount',
      args: [g, a],
    })),
  });

  const activeVotes = await publicClient.multicall({
    contracts: groupAddrsAndAccount.map(([g, a]) => ({
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'getActiveVotesForGroupByAccount',
      args: [g, a],
    })),
  });

  const votes: StakingBalances = {};
  for (let i = 0; i < groupAddrs.length; i++) {
    const groupAddr = groupAddrs[i];
    const pending = pendingVotes[i];
    const active = activeVotes[i];
    if (pending.status !== 'success') throw new Error('Pending votes call failed');
    if (active.status !== 'success') throw new Error('Active votes call failed');
    votes[groupAddr] = { pending: pending.result, active: active.result };
  }

  return votes;
}

export async function checkHasActivatable(
  publicClient: PublicClient,
  stakes: StakingBalances,
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
