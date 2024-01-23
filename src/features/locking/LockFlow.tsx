import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { AccountRegisterForm } from 'src/features/account/AccountRegisterForm';
import { useAccountDetails } from 'src/features/account/hooks';
import { LockForm } from 'src/features/locking/LockForm';
import { LockActionType } from 'src/features/locking/types';
import { TransactionConfirmation } from 'src/features/transactions/TransactionConfirmation';
import { useTransactionFlowConfirmation } from 'src/features/transactions/hooks';

import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

export function LockFlow({
  defaultAction,
  closeModal,
}: {
  defaultAction?: LockActionType;
  closeModal: () => void;
}) {
  const { address } = useAccount();
  const { isRegistered, refetch: refetchAccountDetails } = useAccountDetails(address);

  const { confirmationDetails, onConfirmed } = useTransactionFlowConfirmation();

  let Component;
  if (!address || isNullish(isRegistered)) {
    Component = <SpinnerWithLabel className="py-20">Loading account data...</SpinnerWithLabel>;
  } else if (!isRegistered) {
    Component = <AccountRegisterForm refetchAccountDetails={refetchAccountDetails} />;
  } else if (!confirmationDetails) {
    Component = <LockForm defaultAction={defaultAction} onConfirmed={onConfirmed} />;
  } else {
    Component = (
      <TransactionConfirmation confirmation={confirmationDetails} closeModal={closeModal} />
    );
  }

  return (
    <>
      <div className="border-b border-taupe-300 pb-1.5">
        <h3 className="text-sm font-medium">Lock CELO</h3>
      </div>
      {Component}
    </>
  );
}
