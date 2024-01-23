import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { AccountRegisterForm } from 'src/features/account/AccountRegisterForm';
import { useAccountDetails, useLockedBalance } from 'src/features/account/hooks';
import { LockForm } from 'src/features/locking/LockForm';
import { StakeForm } from 'src/features/staking/StakeForm';
import { StakeActionType } from 'src/features/staking/types';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { TransactionConfirmation } from 'src/features/transactions/TransactionConfirmation';
import { useTransactionFlowConfirmation } from 'src/features/transactions/hooks';

import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

export function StakeFlow({
  defaultGroup,
  defaultAction,
  closeModal,
}: {
  defaultGroup?: Address;
  defaultAction?: StakeActionType;
  closeModal: () => void;
}) {
  const { address } = useAccount();
  const { lockedBalance } = useLockedBalance(address);
  const { stakeBalances } = useStakingBalances(address);
  const { isRegistered, refetch: refetchAccountDetails } = useAccountDetails(address);

  const { confirmationDetails, onConfirmed } = useTransactionFlowConfirmation();

  let Component;
  if (!address || isNullish(lockedBalance) || isNullish(stakeBalances) || isNullish(isRegistered)) {
    Component = <SpinnerWithLabel className="py-20">Loading staking data...</SpinnerWithLabel>;
  } else if (!isRegistered) {
    Component = <AccountRegisterForm refetchAccountDetails={refetchAccountDetails} />;
  } else if (lockedBalance <= 0n && stakeBalances.total <= 0n) {
    Component = <LockForm showTip={true} />;
  } else if (!confirmationDetails) {
    Component = (
      <StakeForm
        defaultGroup={defaultGroup}
        defaultAction={defaultAction}
        onConfirmed={onConfirmed}
      />
    );
  } else {
    Component = (
      <TransactionConfirmation confirmation={confirmationDetails} closeModal={closeModal} />
    );
  }

  return (
    <>
      <div className="border-b border-taupe-300 pb-1.5">
        <h3 className="text-sm font-medium">Stake CELO</h3>
      </div>
      {Component}
    </>
  );
}
