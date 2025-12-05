import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import ManagerABI from 'src/config/stcelo/ManagerABI';
import StakedCeloABI from 'src/config/stcelo/StakedCeloABI';
import { queryCeloBlockscoutLogs } from 'src/features/explorers/blockscout';
import { TransactionLog } from 'src/features/explorers/types';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { logger } from 'src/utils/logger';
import { useStakingMode } from 'src/utils/useStakingMode';
import { decodeEventLog, encodeEventTopics, PublicClient, TransactionReceipt } from 'viem';
import { useReadContract } from 'wagmi';

export function useStrategy(address?: Address) {
  const { mode } = useStakingMode();
  const { isLoading, isError, error, data, refetch } = useReadContract({
    ...ManagerABI,
    functionName: 'getAddressStrategy',
    args: [address!],
    query: {
      enabled: Boolean(address) && mode === 'stCELO',
    },
  });

  useToastError(error, 'Error fetching current strategy');

  return {
    isLoading,
    isError,
    group: data,
    refetch,
  };
}

export function useChangeStrategy(callback: (receipt: TransactionReceipt) => any) {
  const { writeContract } = useWriteContractWithReceipt('liquid stake activation', callback, true);

  const changeStrategy = (group: Address) => {
    writeContract({
      ...ManagerABI,
      functionName: 'changeStrategy',
      args: [group],
    });
  };

  return { changeStrategy };
}

// export function usePendingStakingActivations(address?: Address, groupToStake: GroupToStake = {}) {
//   const pendingGroups = objKeys(groupToStake).filter((group) => groupToStake[group].pending > 0n);

//   const {
//     data: hasActivatable,
//     isError,
//     isLoading,
//     error,
//     refetch,
//   } = useReadContracts({
//     contracts: pendingGroups.map(
//       (g) =>
//         ({
//           address: Addresses.Election,
//           abi: electionABI,
//           functionName: 'hasActivatablePendingVotes',
//           args: [address || ZERO_ADDRESS, g],
//         }) as const,
//     ),
//     allowFailure: true,
//     query: {
//       enabled: !!address && pendingGroups.length > 0,
//       gcTime: GCTime.Default,
//       staleTime: StaleTime.Default,
//     },
//   });

//   const activatableGroups = pendingGroups.filter((_v, i) => !!hasActivatable?.[i].result);
//   const groupToIsActivatable = objMap(groupToStake, (g) => activatableGroups.includes(g));

//   useToastError(error, 'Error fetching pending stake activations');

//   return {
//     activatableGroups,
//     groupToIsActivatable,
//     isError,
//     isLoading,
//     refetch,
//   };
// }

export async function fetchStCELOStakers(client: PublicClient): Promise<AddressTo<bigint>> {
  const topics = encodeEventTopics({
    abi: StakedCeloABI.abi,
    eventName: 'Transfer',
    args: { from: ZERO_ADDRESS },
  });

  const params = `topic0=${topics[0]}&topic2=${topics[2]}&topic0_2_opr=and`;
  const events = await queryCeloBlockscoutLogs(StakedCeloABI.address, params);
  const allStakers: Address[] = [];
  reduceLogs(allStakers, events);

  // Filter out duplicates
  const allStakersUnique = Array.from(new Set(allStakers));

  // Fetch the amount of gold delegated by each delegator using multicall
  const allStakersAndAmount: [Address, bigint][] = (
    await client.multicall({
      allowFailure: false,
      contracts: allStakersUnique.map(
        (address) =>
          ({
            address: StakedCeloABI.address,
            abi: StakedCeloABI.abi,
            functionName: 'balanceOf',
            args: [address],
          }) as const,
      ),
    })
  ).map((balance, index) => [allStakersUnique[index], balance]);

  // Filter out delegators with 0 amount (as they might have undelegated)
  return Object.fromEntries(allStakersAndAmount.filter(([, balance]) => balance > 0n));
}

function reduceLogs(stakers: Address[], logs: TransactionLog[]) {
  for (const log of logs) {
    try {
      if (!log.topics || log.topics.length < 3) {
        continue;
      }

      const { eventName, args } = decodeEventLog({
        abi: StakedCeloABI.abi,
        data: log.data,
        topics: log.topics,
        strict: false,
      });

      if (eventName !== 'Transfer') continue;

      const { to } = args;
      if (!to) {
        continue;
      }

      stakers.push(to);
    } catch (error) {
      logger.warn('Error decoding stcelo transfer event log', error, log);
    }
  }
}
