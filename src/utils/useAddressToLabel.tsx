'use client';

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanDelegateeName, cleanGroupName } from 'src/features/validators/utils';
import { shortenAddress } from 'src/utils/addresses';
import { useInterval } from 'src/utils/asyncHooks';
// import { Client } from 'viem';
// import { getEnsName } from 'viem/actions';
import { usePublicClient } from 'wagmi';

type Fallback = (address: Address) => string;
const defaultFallback: Fallback = (address: Address) => shortenAddress(address);

// NOTE: this symbol is used to differenciate between not found and not searched yet
const FETCH_ME_PLEASE = Symbol();

type ENSMap = Record<Address, string | typeof FETCH_ME_PLEASE | null>;
const singleton: ENSMap = {};

function useLocalLookup() {
  const { addressToGroup } = useValidatorGroups();
  const { addressToDelegatee } = useDelegatees();

  return useCallback(
    (address: Address): string => {
      const groupName = cleanGroupName(addressToGroup?.[address]?.name || '');
      const delegateeName = cleanDelegateeName(addressToDelegatee?.[address]?.name || '');
      const label = groupName || delegateeName;

      return label;
    },
    [addressToDelegatee, addressToGroup],
  );
}

function useAddressToLabelInternal() {
  const publicClient = usePublicClient();
  const localLookup = useLocalLookup();
  const [debouncedMap, setDebouncedMap] = useState<ENSMap>(singleton);

  // NOTE: for now 2 seconds seemed fine, it's sufficient for the UX and
  // gives *plenty* of time to batch calls, could lower it more.
  // NOTE: we're making sure we force singleton to be a new ref by destructuring
  useInterval(() => setDebouncedMap({ ...singleton }), 2_000);

  const newAddresses = useMemo(
    () =>
      Object.entries(debouncedMap)
        .filter(([_address, value]) => value === FETCH_ME_PLEASE)
        .map(([address]) => address as Address),
    [debouncedMap],
  );

  useEffect(() => {
    // NOTE: only fetch if unknown have been added
    if (newAddresses.length === 0 || !publicClient) {
      return;
    }

    void (async () => {
      const newEntries = await Promise.all(
        newAddresses.map(async (address) => {
          // NOTE: in theory that should be translated to a multicall when this works
          // but for now the getEnsName fails with
          // const name = await getEnsName(publicClient as Client, { address });
          const name = null;

          return [address, name] as [Address, string | null];
        }),
      );

      newEntries.forEach(([address, name]) => {
        singleton[address] = name;
      });
    })();
  }, [newAddresses, publicClient]);

  return useCallback(
    (fallbackFn: Fallback) => (address: Address) => {
      // NOTE: if address was never fetched, flag to fetch it
      if (debouncedMap[address] === undefined) {
        singleton[address] = FETCH_ME_PLEASE;
      }
      const ensName = debouncedMap[address] === FETCH_ME_PLEASE ? null : debouncedMap[address];

      // NOTE: make sure to always display something
      return ensName || localLookup(address) || fallbackFn(address);
    },
    [debouncedMap, localLookup],
  );
}

const ENSContext = createContext<ReturnType<typeof useAddressToLabelInternal>>(
  () => defaultFallback,
);

function ENSProvider({ children }: PropsWithChildren) {
  const fn = useAddressToLabelInternal();
  return <ENSContext.Provider value={fn}>{children}</ENSContext.Provider>;
}

const useAddressToLabel = (fallbackFn = defaultFallback) => useContext(ENSContext)(fallbackFn);

export { ENSProvider as default, useAddressToLabel };
