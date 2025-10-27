import { useCallback } from 'react';
import AccountABI from 'src/config/stcelo/AccountABI';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanDelegateeName, cleanGroupName } from 'src/features/validators/utils';
import { shortenAddress } from 'src/utils/addresses';
import { checksumAddress } from 'viem';

const ADDRESS_MAPPINGS = {
  [AccountABI.address]: 'stCELO Contract',
} as Record<Address, string>;

type DefaultFn = (address: Address) => string;
export default function useAddressToLabel(
  defaultFn: DefaultFn = (address: Address) => shortenAddress(address),
) {
  const { addressToGroup } = useValidatorGroups();
  const { addressToDelegatee } = useDelegatees();

  return useCallback(
    (address: Address): string => {
      address = checksumAddress(address);

      const staticMappingName = ADDRESS_MAPPINGS[address];
      const groupName = cleanGroupName(addressToGroup?.[address]?.name || '');
      const delegateeName = cleanDelegateeName(addressToDelegatee?.[address]?.name || '');
      const label = staticMappingName || groupName || delegateeName;

      return label || defaultFn(address);
    },
    [addressToGroup, addressToDelegatee, defaultFn],
  );
}
