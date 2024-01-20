import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { AccountRegisterForm } from 'src/features/account/AccountRegisterForm';
import { useAccountDetails, useLockedBalance } from 'src/features/account/hooks';
import { LockForm } from 'src/features/locking/LockForm';
import { StakeForm } from 'src/features/staking/StakeForm';
import { StakeActionType } from 'src/features/staking/types';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';

import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

export function StakeFlow({
  defaultGroup,
  defaultAction,
}: {
  defaultGroup?: Address;
  defaultAction?: StakeActionType;
}) {
  const { address } = useAccount();
  const { lockedBalance, isLoading: isLoadingLocked } = useLockedBalance(address);
  const { stakeBalances, isLoading: isLoadingStaked } = useStakingBalances(address);
  const {
    isRegistered,
    isLoading: isLoadingRegistration,
    refetch: refetchAccountDetails,
  } = useAccountDetails(address);

  let Component;
  if (
    !address ||
    isLoadingLocked ||
    isLoadingStaked ||
    isLoadingRegistration ||
    isNullish(lockedBalance) ||
    isNullish(stakeBalances) ||
    isNullish(isRegistered)
  ) {
    Component = <SpinnerWithLabel className="py-20">Loading staking data...</SpinnerWithLabel>;
  } else if (!isRegistered) {
    Component = <AccountRegisterForm refetchAccountDetails={refetchAccountDetails} />;
  } else if (lockedBalance <= 0n && stakeBalances.total <= 0n) {
    Component = <LockForm showTip={true} />;
  } else {
    Component = <StakeForm defaultGroup={defaultGroup} defaultAction={defaultAction} />;
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
