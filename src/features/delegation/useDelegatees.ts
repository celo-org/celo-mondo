import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';

export function useDelegatees() {
  // TODO using validator groups for now
  const { addressToGroup, isError, isLoading } = useValidatorGroups();
  return {
    addressToDelegatee: addressToGroup,
    isError,
    isLoading,
  };
}
