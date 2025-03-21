import { EIP712Delegatee, RegisterDelegateFormValues } from 'src/features/delegation/types';
import { sha256 } from 'viem';
import { useSignTypedData } from 'wagmi';

export function useSignedData() {
  const { signTypedDataAsync } = useSignTypedData();

  return async (values: RegisterDelegateFormValues) => {
    if (!values.image) {
      throw new Error('Image required');
    }

    return signTypedDataAsync({
      ...EIP712Delegatee,
      message: {
        ...values,
        imageSha: sha256(new Uint8Array(await values.image.arrayBuffer())),
        websiteUrl: values.websiteUrl || '',
        twitterUrl: values.twitterUrl || '',
      },
    });
  };
}
