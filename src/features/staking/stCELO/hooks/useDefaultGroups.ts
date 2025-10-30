import { readContract } from '@wagmi/core';
import { useCallback, useEffect, useState } from 'react';
import DefaultStrategyABI from 'src/config/stcelo/DefaultStrategyABI';
import { readFromCache, writeToCache } from 'src/utils/localSave';
import type { Address } from 'viem';
import { useConfig, useReadContract } from 'wagmi';

const FEW_HOURS = 4 * 60 * 60 * 1000;

const cacheKey = 'defaultGroups';

export default function useDefaultGroups(): { activeGroups: Address[]; error?: Error } {
  const [activeGroups, setActiveGroups] = useState<Address[]>([]);
  const [error, setError] = useState<Error>();

  const { data: activeGroupsLength } = useReadContract({
    ...DefaultStrategyABI,
    functionName: 'getNumberOfGroups',
    query: { gcTime: FEW_HOURS },
    args: [],
  });

  const config = useConfig();

  const { data: groupsHead } = useReadContract({
    ...DefaultStrategyABI,
    functionName: 'getGroupsHead',
    query: { gcTime: FEW_HOURS },
    args: [],
  });

  const fetchGroups = useCallback(
    async (key: Address, length: bigint) => {
      const groups: Address[] = [key];

      for (let i = 0; i < length; i++) {
        const previousAndNext = await readContract(config, {
          ...DefaultStrategyABI,
          functionName: 'getGroupPreviousAndNext',
          args: [key],
        });
        [key] = previousAndNext;
        groups.push(key);
      }

      return groups;
    },
    [config],
  );

  useEffect(() => {
    const cachedGroups = readFromCache(cacheKey);
    const shouldUseCache = cachedGroups && cachedGroups.ts + FEW_HOURS > Date.now();

    if (shouldUseCache) {
      setActiveGroups(cachedGroups!.data as Address[]);
    } else if (groupsHead && activeGroupsLength) {
      void fetchGroups(groupsHead[0], activeGroupsLength)
        .then((groups) => {
          writeToCache(cacheKey, groups);
          setActiveGroups(groups);
        })
        .catch((err) => {
          setError(err as Error);
        });
    }
  }, [groupsHead, activeGroupsLength, fetchGroups]);

  return { activeGroups, error };
}
