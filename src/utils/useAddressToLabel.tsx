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
import AccountABI from 'src/config/stcelo/AccountABI';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanDelegateeName, cleanGroupName } from 'src/features/validators/utils';
import { shortenAddress } from 'src/utils/addresses';
import { useInterval } from 'src/utils/asyncHooks';
import { type Address, checksumAddress } from 'viem';
import { usePublicClient } from 'wagmi';

const ADDRESS_MAPPINGS = {
  [AccountABI.address]: 'stCELO Contract',
} as Record<Address, string>;

type Fallback = (address: Address) => string;
const defaultFallback: Fallback = (address: Address) => shortenAddress(address);

// NOTE: this symbol is used to differenciate between not found and not searched yet
const FETCH_ME_PLEASE = Symbol();
const NAME_NOT_FOUND = Symbol();

type ENSMap = Record<Address, string | typeof FETCH_ME_PLEASE | typeof NAME_NOT_FOUND>;
const singleton: ENSMap = {};

const GRAPHQL_QueryWithAddresses = `
query QueryWithAddresses($addresses: [String!]) {
  names(where: {owner_in: $addresses}) {
    items {
      label
      owner
    }
  }
}
`;

function useLocalLookup() {
  const { addressToGroup } = useValidatorGroups();
  const { addressToDelegatee } = useDelegatees();

  return useCallback(
    (address: Address): string => {
      address = checksumAddress(address);
      const groupName = cleanGroupName(addressToGroup?.[address]?.name || '');
      const delegateeName = cleanDelegateeName(addressToDelegatee?.[address]?.name || '');
      const staticMappingName = ADDRESS_MAPPINGS[address];
      const label = staticMappingName || groupName || delegateeName;

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
      const endpoint = 'https://celo-indexer-reader.namespace.ninja/graphql';
      try {
        const { errors, data } = (await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            query: GRAPHQL_QueryWithAddresses,
            variables: { addresses: newAddresses.map((x) => x.toLowerCase()) },
          }),
        }).then((x) => x.json())) as {
          errors: { message: string }[] | undefined;
          data: { names: { items: { label: string; owner: Address }[] } };
        };

        if (errors) {
          throw errors;
        }

        for (const address of newAddresses) {
          const entry = data.names.items.find((x) => x.owner === address);
          singleton[address] = entry ? entry.label : NAME_NOT_FOUND;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('ens lookup failed', err);
        // NOTE: prevent infinite lookups
        for (const address of newAddresses) {
          singleton[address] = NAME_NOT_FOUND;
        }
      }
    })();
  }, [newAddresses, publicClient]);

  return useCallback(
    (fallbackFn: Fallback) =>
      (address: Address): string => {
        // NOTE: lowercase for easier graphql matching
        // because celonames lowercases addresses
        const lowercased = address.toLowerCase() as Address;
        // NOTE: if address was never fetched, flag to fetch it
        if (!debouncedMap[lowercased]) {
          singleton[lowercased] = FETCH_ME_PLEASE;
        }
        const ensName =
          typeof debouncedMap[lowercased] === 'symbol' ? null : debouncedMap[lowercased];

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
