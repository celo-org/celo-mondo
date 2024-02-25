import { FunctionComponent, ReactNode, useCallback, useState } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { AccountRegisterForm } from 'src/features/account/AccountRegisterForm';
import { useAccountDetails, useLockedBalance } from 'src/features/account/hooks';
import { LockForm } from 'src/features/locking/LockForm';
import { TransactionConfirmation } from 'src/features/transactions/TransactionConfirmation';
import { ConfirmationDetails, OnConfirmedFn } from 'src/features/transactions/types';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

export interface TransactionFlowProps<FormDefaults extends {} = {}> {
  header: string;
  FormComponent: FunctionComponent<{ onConfirmed: OnConfirmedFn; defaultFormValues: FormDefaults }>;
  requiresLockedFunds?: boolean;
  defaultFormValues?: FormDefaults;
}

// Since all the transactions flow follow similar logic around account
// registration checks, this component defines a reusable flow.
export function TransactionFlow<FormDefaults extends {}>({
  header,
  FormComponent,
  requiresLockedFunds = true,
  defaultFormValues = {} as FormDefaults,
  closeModal,
}: TransactionFlowProps<FormDefaults> & { closeModal: () => void }) {
  const { address } = useAccount();
  const { lockedBalance } = useLockedBalance(address);
  const { isRegistered, refetch: refetchAccountDetails } = useAccountDetails(address);
  const { confirmationDetails, onConfirmed } = useTransactionFlowConfirmation();

  let Component: ReactNode;
  if (!address || isNullish(lockedBalance) || isNullish(isRegistered)) {
    Component = <SpinnerWithLabel className="py-20">Loading account data...</SpinnerWithLabel>;
  } else if (!isRegistered) {
    Component = <AccountRegisterForm refetchAccountDetails={refetchAccountDetails} />;
  } else if (lockedBalance <= 0n && requiresLockedFunds) {
    Component = <LockForm showTip={true} />;
  } else if (!confirmationDetails) {
    Component = <FormComponent defaultFormValues={defaultFormValues} onConfirmed={onConfirmed} />;
  } else {
    Component = (
      <TransactionConfirmation confirmation={confirmationDetails} closeModal={closeModal} />
    );
  }

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
