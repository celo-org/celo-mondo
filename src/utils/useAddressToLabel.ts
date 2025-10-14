import { useCallback } from 'react';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanDelegateeName, cleanGroupName } from 'src/features/validators/utils';
import { shortenAddress } from 'src/utils/addresses';

type DefaultFn = (address: Address) => string;
export default function useAddressToLabel(
  defaultFn: DefaultFn = (address: Address) => shortenAddress(address),
) {
  const { addressToGroup } = useValidatorGroups();
  const { addressToDelegatee } = useDelegatees();

  return useCallback(
    (address: Address): string => {
      const groupName = cleanGroupName(addressToGroup?.[address]?.name || '');
      const delegateeName = cleanDelegateeName(addressToDelegatee?.[address]?.name || '');
      const label = groupName || delegateeName;

      return label || defaultFn(address);
    },
    [addressToGroup, addressToDelegatee, defaultFn],
  );
}
