import { EIP712Delegatee, RegisterDelegateFormValues } from 'src/features/delegation/types';
import { useSignTypedData } from 'wagmi';

export function useSignedData() {
  const { signTypedDataAsync } = useSignTypedData();
  return ({
    name,
    address,
    verificationUrl,
  }: Pick<RegisterDelegateFormValues, 'address' | 'name' | 'verificationUrl'>) => {
    return signTypedDataAsync({
      ...EIP712Delegatee,
      message: {
        name,
        address,
        verificationUrl,
      },
    });
  };
}
