import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  createElement,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import AccountABI from 'src/config/stcelo/AccountABI';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanDelegateeName, cleanGroupName } from 'src/features/validators/utils';
import { shortenAddress } from 'src/utils/addresses';
import { useInterval } from 'src/utils/asyncHooks';
import { objMap } from 'src/utils/objects';
import { Address, checksumAddress } from 'viem';
import { usePublicClient } from 'wagmi';

type Label = {
  label: string | null;
  fallback: string;
  address: Address;
  isCeloName: boolean;
};

const ADDRESS_MAPPINGS = {
  [AccountABI.address]: 'stCELO Contract',
} as Record<Address, string>;

type Fallback = (address: Address) => string;
const defaultFallback: Fallback = (address: Address) => shortenAddress(address);

// NOTE: these symbols are used to differenciate between not found and not searched yet
const FETCH_ME_PLEASE = Symbol('fetch_me_please');
const NAME_NOT_FOUND = Symbol('name_not_found');

const CACHE_KEY = 'celonames_cache';
type ENSMap = Record<Address, string | typeof FETCH_ME_PLEASE | typeof NAME_NOT_FOUND>;

// NOTE: hydrate from localstorage
const singleton: ENSMap = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');

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

  useQuery({
    enabled: newAddresses.length > 0 && !!publicClient,
    queryKey: [newAddresses],
    // gcTime: GCTime.Default,
    // staleTime: StaleTime.Default,
    queryFn: async () => {
      const endpoint = 'https://celo-indexer-reader.namespace.ninja/graphql';
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
        console.error('Failed to fetch celonames', errors);
        return null;
      }

      for (const address of newAddresses) {
        const entry = data.names.items.find((x) => x.owner === address);
        singleton[address] = entry ? `${entry.label}${CELONAMES_SUFFIX}` : NAME_NOT_FOUND;
      }

      // NOTE: persist without the special values
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify(
          objMap(singleton, (_, label) =>
            label === FETCH_ME_PLEASE || label === NAME_NOT_FOUND ? undefined : label,
          ),
        ),
      );

      return data;
    },
  });

  return useCallback(
    (fallbackFn: Fallback) =>
      (address: Address): Label => {
        // NOTE: lowercase for easier graphql matching
        // because celonames lowercases addresses
        const lowercased = address.toLowerCase() as Address;
        // NOTE: if address was never fetched, flag to fetch it
        if (!debouncedMap[lowercased]) {
          singleton[lowercased] = FETCH_ME_PLEASE;
        }

        const ensName =
          typeof debouncedMap[lowercased] === 'symbol' ? null : debouncedMap[lowercased];

        return {
          fallback: fallbackFn(address),
          address,
          label: ensName || localLookup(address) || null,
          isCeloName: !!ensName,
        };
      },
    [debouncedMap, localLookup],
  );
}

const ENSContext = createContext<ReturnType<typeof useAddressToLabelInternal>>(
  () => (address: Address) => ({
    fallback: defaultFallback(address),
    address,
    label: null,
    isCeloName: false,
  }),
);

function ENSProvider({ children }: PropsWithChildren) {
  const fn = useAddressToLabelInternal();

  return createElement(ENSContext.Provider, { value: fn }, children);
}

export { ENSProvider as default };
export const useAddressToLabel = (fallbackFn = defaultFallback) =>
  useContext(ENSContext)(fallbackFn);
export const CELONAMES_SUFFIX = '.celo.eth';
