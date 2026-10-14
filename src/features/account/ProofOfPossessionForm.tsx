import { Form, Formik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { SkeletonBlock } from 'src/components/animation/Skeleton';
import { CopyButton } from 'src/components/buttons/CopyButton';
import { FormSubmitButton } from 'src/components/buttons/FormSubmitButton';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { TextField } from 'src/components/input/TextField';
import { TipBox } from 'src/components/layout/TipBox';
import { ZERO_ADDRESS } from 'src/config/consts';
import { useAuthorizedBy, useIsAccount } from 'src/features/account/hooks';
import {
  ProofOfPossessionFormValues,
  getProofOfPossessionMessage,
  recoverProofOfPossessionSigner,
} from 'src/features/account/voteSigner';
import { eqAddress, isValidAddress, shortenAddress } from 'src/utils/addresses';
import { logger } from 'src/utils/logger';
import { Address, Hex } from 'viem';
import { useConnection, useSignMessage } from 'wagmi';

// Signer side of the vote signer setup: proves this wallet controls its key by signing
// the principal account's address. The output is pasted into the principal's authorize form.
export function ProofOfPossessionForm() {
  const { address } = useConnection();
  const isAccount = useIsAccount(address);
  const binding = useAuthorizedBy(address);
  // A key that was ever authorized stays bound to that account, so a proof for any other
  // account could never be used
  const boundAccount =
    binding.data && !eqAddress(binding.data, ZERO_ADDRESS) ? binding.data : undefined;
  if (isAccount.data) {
    return (
      <TipBox color="yellow">
        This wallet is already registered as an account, so it cannot become a vote signer.
      </TipBox>
    );
  }
  // Both reads decide what this wallet may sign for, so never show the form before they settle
  if (isAccount.isPending || binding.isPending) {
    return (
      <div data-testid="proof-of-possession-loading">
        <SkeletonBlock className="h-24 w-full" />
      </div>
    );
  }
  if (isAccount.isError || binding.isError) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-red-600" data-testid="proof-of-possession-error">
          Could not check what this wallet may sign for.
        </p>
        <OutlineButton onClick={() => Promise.all([isAccount.refetch(), binding.refetch()])}>
          Retry
        </OutlineButton>
      </div>
    );
  }

  // Keyed so the values and any generated proof reset when the wallet or its binding changes
  return (
    <ProofForm
      key={`${address ?? ''}-${boundAccount ?? ''}`}
      address={address}
      boundAccount={boundAccount}
    />
  );
}

function ProofForm({ address, boundAccount }: { address?: Address; boundAccount?: Address }) {
  const { mutateAsync: signMessageAsync, isPending } = useSignMessage();
  // Keep the signing wallet and the signed-for account next to the signature so a proof
  // is only ever shown for the wallet that produced it and the account currently in the field.
  // The signer is recovered from the signature itself, so the displayed proof is self-verified
  // even if the wallet switched while the signing prompt was open.
  const [proof, setProof] = useState<{ signer: Address; account: Address; signature: Hex }>();

  const onSubmit = async (values: ProofOfPossessionFormValues) => {
    const account = values.account.trim() as Address;
    setProof(undefined);
    try {
      const signature = await signMessageAsync({ message: getProofOfPossessionMessage(account) });
      const signer = await recoverProofOfPossessionSigner(account, signature);
      setProof({ signer, account, signature });
    } catch (error) {
      logger.error('Error signing proof of possession', error);
      toast.error('Signing failed, please check your wallet');
    }
  };

  const validate = (values: ProofOfPossessionFormValues) => {
    const account = values.account.trim();
    if (!isValidAddress(account)) return { account: 'Invalid account address' };
    if (address && eqAddress(account, address)) return { account: 'Enter the other account' };
    if (boundAccount && !eqAddress(account, boundAccount)) {
      return { account: `This wallet can only sign for ${shortenAddress(boundAccount)}` };
    }
    return {};
  };

  return (
    <Formik<ProofOfPossessionFormValues>
      initialValues={{ account: boundAccount ?? '' }}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ values }) => {
        const signature =
          proof &&
          address &&
          eqAddress(proof.signer, address) &&
          values.account.trim().toLowerCase() === proof.account.toLowerCase()
            ? proof.signature
            : undefined;
        return (
          <Form className="space-y-3" data-testid="proof-of-possession-form">
            {boundAccount && (
              <TipBox color="yellow">
                This wallet was already authorized by {shortenAddress(boundAccount)} and stays
                permanently tied to it, so it can only be re-authorized by that account.
              </TipBox>
            )}
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
                <TipBox color="yellow">
                  Only share this with the owner of that account. Once they authorize this wallet,
                  it is permanently tied to their account and can never register as its own account
                  or sign for another one.
                </TipBox>
              </div>
            )}
          </Form>
        );
      }}
    </Formik>
  );
}
