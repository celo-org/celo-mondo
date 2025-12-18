import { FunctionComponent, ReactNode, useCallback, useState } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { AccountRegisterForm } from 'src/features/account/AccountRegisterForm';
import {
  useIsAccount,
  useLockedBalance,
  useStCELOBalance,
  useVoteSignerToAccount,
} from 'src/features/account/hooks';
import { DelegateActionType } from 'src/features/delegation/types';
import { useGovernanceVotingPower } from 'src/features/governance/hooks/useVotingStatus';
import { VoteForm } from 'src/features/governance/VoteForm';
import { LockForm } from 'src/features/locking/LockForm';
import { StakeStCeloForm } from 'src/features/staking/stCELO/StakeForm';
import { TransactionConfirmation } from 'src/features/transactions/TransactionConfirmation';
import { ConfirmationDetails, OnConfirmedFn } from 'src/features/transactions/types';
import { capitalizeFirstLetter } from 'src/utils/strings';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

export interface TransactionFlowProps<FormDefaults extends {} = {}> {
  header: string;
  FormComponent: FunctionComponent<{ onConfirmed: OnConfirmedFn; defaultFormValues: FormDefaults }>;
  requiresLockedFundsOrVoteSigner?: boolean;
  requiresStCelo?: boolean;
  defaultFormValues?: FormDefaults;
}

// Since all the transactions flow follow similar logic around account
// registration checks, this component defines a reusable flow.
export function TransactionFlow<FormDefaults extends {}>({
  header: defaultHeader,
  FormComponent,
  requiresLockedFundsOrVoteSigner = true,
  requiresStCelo = false,
  defaultFormValues = {} as FormDefaults,
  closeModal,
}: TransactionFlowProps<FormDefaults> & { closeModal: () => void }) {
  const { address } = useAccount();
  const { data: isRegistered, refetch: refetchAccountDetails } = useIsAccount(address);
  const { signingFor: signingForAccount, isLoading: isAccountLoading } =
    useVoteSignerToAccount(address);
  const { lockedBalance } = useLockedBalance(address);
  const { stCELOBalances } = useStCELOBalance(address);
  const { confirmationDetails, onConfirmed } = useTransactionFlowConfirmation();
  const isVoteSigner = Boolean(signingForAccount && signingForAccount !== address);

  const votingPower = useGovernanceVotingPower(address);

  const hasVotingPower =
    typeof votingPower.votingPower === 'bigint' && votingPower.votingPower > 0n;

  // voting power includes votes delegated to the account and locked celo
  const willVoteAndHasVotingPower = FormComponent.name === VoteForm.name && hasVotingPower;

  let Component: ReactNode;
  let header = defaultHeader;
  if (
    !address ||
    isNullish(lockedBalance) ||
    isNullish(isRegistered) ||
    isAccountLoading ||
    votingPower.isLoading
  ) {
    Component = <SpinnerWithLabel className="py-20">Loading account data...</SpinnerWithLabel>;
  } else if (!isRegistered && !isVoteSigner) {
    Component = <AccountRegisterForm refetchAccountDetails={refetchAccountDetails} />;
  } else if (
    lockedBalance <= 0n &&
    requiresLockedFundsOrVoteSigner &&
    !isVoteSigner &&
    !willVoteAndHasVotingPower
  ) {
    Component = <LockForm showTip={true} />;
  } else if (requiresStCelo && stCELOBalances.total <= 0n) {
    // Will be caught by error boundary
    // but we should never be here because no stCELO component should ever be
    // shown without a stCELOBalance being positive in the first place
    Component = <StakeStCeloForm showTip={true} />;
  } else if (!confirmationDetails) {
    const action = (defaultFormValues as any).action as string;
    if (action) {
      if (action === DelegateActionType.Transfer) {
        header = 'Transfer delegation';
      } else {
        header = `${capitalizeFirstLetter(action)} CELO`;
      }
    }

    Component = <FormComponent defaultFormValues={defaultFormValues} onConfirmed={onConfirmed} />;
  } else {
    Component = (
      <TransactionConfirmation confirmation={confirmationDetails} closeModal={closeModal} />
    );
  }
  ``;

  return (
    <>
      <div className="border-b border-taupe-300 pb-1.5">
        <h3 className="text-sm font-medium">{header}</h3>
      </div>
      {Component}
    </>
  );
}

export function useTransactionFlowConfirmation() {
  const [confirmationDetails, setConfirmationDetails] = useState<ConfirmationDetails | undefined>(
    undefined,
  );
  const onConfirmed = useCallback((d: ConfirmationDetails) => setConfirmationDetails(d), []);
  return { confirmationDetails, onConfirmed };
}
