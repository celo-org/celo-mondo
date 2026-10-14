import { Form, Formik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { CopyButton } from 'src/components/buttons/CopyButton';
import { FormSubmitButton } from 'src/components/buttons/FormSubmitButton';
import { TextField } from 'src/components/input/TextField';
import { TipBox } from 'src/components/layout/TipBox';
import { useIsAccount } from 'src/features/account/hooks';
import {
  ProofOfPossessionFormValues,
  getProofOfPossessionMessage,
} from 'src/features/account/voteSigner';
import { eqAddress, isValidAddress } from 'src/utils/addresses';
import { logger } from 'src/utils/logger';
import { Address, Hex } from 'viem';
import { useConnection, useSignMessage } from 'wagmi';

// Signer side of the vote signer setup: proves this wallet controls its key by signing
// the principal account's address. The output is pasted into the principal's authorize form.
export function ProofOfPossessionForm() {
  const { address } = useConnection();
  const { data: isRegistered } = useIsAccount(address);
  const { mutateAsync: signMessageAsync, isPending } = useSignMessage();
  const [signature, setSignature] = useState<Hex>();

  const onSubmit = async (values: ProofOfPossessionFormValues) => {
    try {
      const account = values.account.trim() as Address;
      setSignature(await signMessageAsync({ message: getProofOfPossessionMessage(account) }));
    } catch (error) {
      logger.error('Error signing proof of possession', error);
      toast.error('Signing failed, please check your wallet');
    }
  };

  const validate = (values: ProofOfPossessionFormValues) => {
    const account = values.account.trim();
    if (!isValidAddress(account)) return { account: 'Invalid account address' };
    if (address && eqAddress(account, address)) return { account: 'Enter the other account' };
    return {};
  };

  if (isRegistered) {
    return (
      <TipBox color="yellow">
        This wallet is already registered as an account, so it cannot become a vote signer.
      </TipBox>
    );
  }

  return (
    <Formik<ProofOfPossessionFormValues>
      initialValues={{ account: '' }}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      <Form className="space-y-3" data-testid="proof-of-possession-form">
        <div className="space-y-1">
          <label htmlFor="account" className="pl-0.5 text-xs font-medium">
            Account to vote on behalf of
          </label>
          <TextField
            id="account"
            name="account"
            placeholder="0x..."
            className="w-full font-mono text-sm"
            disabled={isPending}
          />
        </div>
        <FormSubmitButton
          isLoading={isPending}
          loadingText="Signing"
          data-testid="proof-of-possession-submit"
        >
          Sign proof of possession
        </FormSubmitButton>
        {signature && (
          <div className="space-y-1">
            <p className="pl-0.5 text-xs font-medium">Proof of possession</p>
            <div className="flex items-start space-x-2 border border-taupe-300 p-2">
              <code
                className="ph-no-capture grow break-all font-mono text-xs"
                data-testid="proof-of-possession-signature"
              >
                {signature}
              </code>
              <CopyButton copyValue={signature} width={16} height={16} />
            </div>
            <p className="text-xs text-taupe-600">
              Send this to the account owner. They paste it under Account → Settings → Authorize
              vote signer.
            </p>
          </div>
        )}
      </Form>
    </Formik>
  );
}
