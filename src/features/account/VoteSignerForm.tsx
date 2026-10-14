import { accountsABI } from '@celo/abis';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikErrors } from 'formik';
import { useCallback, useRef } from 'react';
import { FormSubmitButton } from 'src/components/buttons/FormSubmitButton';
import { TextField } from 'src/components/input/TextField';
import { TipBox } from 'src/components/layout/TipBox';
import { config } from 'src/config/config';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useIsAccount } from 'src/features/account/hooks';
import {
  VoteSignerFormValues,
  parseProofOfPossession,
  recoverProofOfPossessionSigner,
} from 'src/features/account/voteSigner';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { eqAddress, isValidAddress, shortenAddress } from 'src/utils/addresses';
import { logger } from 'src/utils/logger';
import { useTrackEvent } from 'src/utils/useTrackEvent';
import { Address, Hex, TransactionReceipt, isHex } from 'viem';
import { useConnection, usePublicClient } from 'wagmi';

const initialValues: VoteSignerFormValues = { signer: '', signature: '' };
type WriteArgs = Parameters<ReturnType<typeof useWriteContractWithReceipt>['writeContract']>[0];

export function VoteSignerForm({ onConfirmed }: { onConfirmed: OnConfirmedFn }) {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { data: isRegistered } = useIsAccount(address);
  const queryClient = useQueryClient();
  const trackEvent = useTrackEvent();

  // The values behind the transaction currently in flight. Every submission builds its own
  // transaction (no cached plan), so a rejected or failed attempt can never resend an
  // earlier signer after the form was edited.
  const submitted = useRef<VoteSignerFormValues>(undefined);
  const onTxSuccess = useCallback(
    (receipt: TransactionReceipt) => {
      const values = submitted.current;
      if (!values) {
        logger.error('Vote signer authorization confirmed without submitted values');
        return;
      }
      trackEvent('vote_signer_authorized', {});
      // The settings view behind the modal reads getVoteSigner and must pick up the change
      void queryClient.invalidateQueries({ queryKey: ['readContract'] });
      onConfirmed({
        message: 'Vote signer authorized',
        receipt,
        properties: [{ label: 'Signer', value: shortenAddress(values.signer.trim()) }],
      });
    },
    [trackEvent, queryClient, onConfirmed],
  );
  const { writeContract, isLoading } = useWriteContractWithReceipt(
    'vote signer authorization',
    onTxSuccess,
  );

  const onSubmit = (values: VoteSignerFormValues) => {
    submitted.current = values;
    return writeContract(getAuthorizeTx(values));
  };

  const validate = async (values: VoteSignerFormValues) => {
    if (!address || !publicClient) return { signer: 'Form data not ready' };
    if (!isRegistered) return { signer: 'Connected wallet is not a registered account' };
    const errors = await validateForm(values, address, publicClient).catch((error) => {
      logger.error('Error validating vote signer form', error);
      return { signature: 'Could not verify the proof of possession' };
    });
    return errors;
  };

  return (
    <Formik<VoteSignerFormValues>
      initialValues={initialValues}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      <Form
        className="mt-4 flex flex-1 flex-col justify-between space-y-3"
        data-testid="vote-signer-form"
      >
        <div className="space-y-3">
          <TipBox color="purple">
            A vote signer votes, stakes and delegates on behalf of this account without holding its
            locked CELO. The signer wallet must first create a proof of possession for this account
            under Account → Settings.
          </TipBox>
          <TipBox color="yellow">
            This permanently ties the signer key to this account. Even after you remove it, that
            wallet can never register as its own account or sign for a different account.
          </TipBox>
          <div className="space-y-1">
            <label htmlFor="signer" className="pl-0.5 text-xs font-medium">
              Vote signer address
            </label>
            <TextField
              id="signer"
              name="signer"
              placeholder="0x..."
              className="w-full font-mono text-sm"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="signature" className="pl-0.5 text-xs font-medium">
              Proof of possession
            </label>
            <TextField
              id="signature"
              name="signature"
              as="textarea"
              rows={3}
              placeholder="0x..."
              className="w-full resize-none font-mono text-sm"
              disabled={isLoading}
            />
          </div>
        </div>
        <FormSubmitButton
          isLoading={isLoading}
          loadingText="Authorizing"
          data-testid="vote-signer-form-submit"
        >
          Authorize
        </FormSubmitButton>
      </Form>
    </Formik>
  );
}

// Only called after validateForm accepted the values, so the casts below are safe
function getAuthorizeTx(values: VoteSignerFormValues): WriteArgs {
  const { v, r, s } = parseProofOfPossession(values.signature.trim() as Hex);
  return {
    chainId: config.chain.id,
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'authorizeVoteSigner',
    args: [values.signer.trim() as Address, v, r, s],
  };
}

// Mirrors the Accounts contract's own checks so the user gets a precise error
// instead of a failed gas estimate.
async function validateForm(
  values: VoteSignerFormValues,
  account: Address,
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
): Promise<FormikErrors<VoteSignerFormValues>> {
  const signer = values.signer.trim();
  const signature = values.signature.trim();
  if (!isValidAddress(signer)) return { signer: 'Invalid signer address' };
  if (eqAddress(signer, account)) return { signer: 'Signer must be a different wallet' };
  if (!isHex(signature) || signature.length !== 132) {
    return { signature: 'Proof of possession must be a 65 byte hex signature' };
  }

  const recovered = await recoverProofOfPossessionSigner(account, signature).catch(() => null);
  if (!recovered || !eqAddress(recovered, signer)) {
    return { signature: 'Proof of possession was not signed by this signer for your account' };
  }

  const [isAccount, authorizedBy, currentSigner] = await Promise.all([
    publicClient.readContract({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'isAccount',
      args: [signer],
    }),
    publicClient.readContract({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'authorizedBy',
      args: [signer],
    }),
    publicClient.readContract({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'getVoteSigner',
      args: [account],
    }),
  ]);
  if (isAccount) return { signer: 'Signer is already a registered account' };
  if (authorizedBy !== ZERO_ADDRESS && !eqAddress(authorizedBy, account)) {
    return { signer: 'Signer is already authorized for another account' };
  }
  // Authorizing over an existing signer would replace it without revoking the old key
  if (!eqAddress(currentSigner, account) && !eqAddress(currentSigner, signer)) {
    return { signer: 'Remove the current vote signer before authorizing a new one' };
  }
  return {};
}
