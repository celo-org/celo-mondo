import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { AccountRegisterForm } from 'src/features/account/AccountRegisterForm';
import { useAccountDetails } from 'src/features/account/hooks';
import { LockForm } from 'src/features/locking/LockForm';
import { LockActionType } from 'src/features/locking/types';

import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

export function LockFlow({ defaultAction }: { defaultAction?: LockActionType }) {
  const { address } = useAccount();
  const {
    isRegistered,
    isLoading: isLoadingRegistration,
    refetch: refetchAccountDetails,
  } = useAccountDetails(address);

  let Component;
  if (!address || isLoadingRegistration || isNullish(isRegistered)) {
    Component = <SpinnerWithLabel className="py-20">Loading account data...</SpinnerWithLabel>;
  } else if (!isRegistered) {
    Component = <AccountRegisterForm refetchAccountDetails={refetchAccountDetails} />;
  } else {
    Component = <LockForm defaultAction={defaultAction} />;
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
