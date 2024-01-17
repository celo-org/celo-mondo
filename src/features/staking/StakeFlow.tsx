import { Spinner } from 'src/components/animation/Spinner';
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
  const { isRegistered, isLoading: isLoadingRegistration } = useAccountDetails(address);

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
    Component = <Spinner size="lg" />;
  } else if (!isRegistered) {
    Component = <AccountRegisterForm />;
  } else if (lockedBalance <= 0 && stakeBalances.total <= 0) {
    Component = <LockForm />;
  } else {
    Component = <StakeForm defaultGroup={defaultGroup} defaultAction={defaultAction} />;
  }

  return (
    <div className="flex min-h-[30rem] min-w-[20rem] items-center justify-center">{Component}</div>
  );
}
