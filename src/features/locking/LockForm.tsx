import { Field, Form, Formik, FormikErrors, useField, useFormikContext } from 'formik';
import Image from 'next/image';
import { useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { FormSubmitButton } from 'src/components/buttons/FormSubmitButton';
import { AmountField } from 'src/components/input/AmountField';
import { useBalance } from 'src/features/account/hooks';
import { useIsGovernanceVoting } from 'src/features/governance/useVotingStatus';
import { LockActionType, LockedBalances } from 'src/features/locking/types';
import { useLockedStatus } from 'src/features/locking/useLockedStatus';
import {
  getTotalNonvotingLocked,
  getTotalPendingCelo,
  getTotalUnlockedCelo,
} from 'src/features/locking/utils';
import { StakingBalances } from 'src/features/staking/types';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import InfoIcon from 'src/images/icons/info-circle.svg';
import { fromWeiRounded, toWei } from 'src/utils/amount';
import { logger } from 'src/utils/logger';
import { toTitleCase } from 'src/utils/strings';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

interface LockFormValues {
  amount: number;
  action: LockActionType;
}

const initialValues: LockFormValues = {
  amount: 0,
  action: LockActionType.Lock,
};

export function LockForm({
  defaultAction,
  showTip,
}: {
  defaultAction?: LockActionType;
  showTip?: boolean;
}) {
  const { address } = useAccount();
  const { balance: walletBalance } = useBalance(address);
  const { lockedBalances } = useLockedStatus(address);
  const { stakeBalances } = useStakingBalances(address);
  const { isVoting } = useIsGovernanceVoting(address);

  const onSubmit = (values: LockFormValues) => {
    // TODO execute lock plan here, may require many txs
    alert(values);
  };

  const validate = (values: LockFormValues) => {
    if (!walletBalance || !lockedBalances || !stakeBalances || isNullish(isVoting)) {
      return { amount: 'Form not ready' };
    }
    return validateForm(values, lockedBalances, walletBalance, stakeBalances, isVoting);
  };

  return (
    <Formik<LockFormValues>
      initialValues={{
        ...initialValues,
        action: defaultAction || initialValues.action,
      }}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ values }) => (
        <Form className="mt-3 flex flex-1 flex-col justify-between">
          <div className="space-y-6">
            {showTip && (
              <div className="flex space-x-2 bg-purple-50 p-2 text-xs">
                <Image src={InfoIcon} width={16} height={16} alt="tip" />
                <span>
                  You currently have no locked CELO. Only locked CELO can participate in staking.
                  Lock funds to begin.
                </span>
              </div>
            )}
            <ActionTypeField defaultAction={defaultAction} />
            <LockAmountField
              lockedBalances={lockedBalances}
              walletBalance={walletBalance}
              action={values.action}
            />
          </div>
          <FormSubmitButton isLoading={false} loadingText={ActionToVerb[values.action]}>
            {toTitleCase(values.action)}
          </FormSubmitButton>
        </Form>
      )}
    </Formik>
  );
}

function LockAmountField({
  lockedBalances,
  walletBalance,
  action,
}: {
  lockedBalances?: LockedBalances;
  walletBalance?: bigint;
  action: LockActionType;
}) {
  const maxAmountWei = useMemo(
    () => getMaxAmount(action, lockedBalances, walletBalance),
    [lockedBalances, walletBalance, action],
  );

  // Auto set amount for withdraw action
  const isWithdraw = action === LockActionType.Withdraw;
  const { setFieldValue } = useFormikContext();
  useEffect(() => {
    if (!isWithdraw) return;
    setFieldValue('amount', fromWeiRounded(maxAmountWei)).catch((e) => logger.error(e));
  }, [maxAmountWei, isWithdraw, setFieldValue]);

  return (
    <AmountField
      maxValueWei={maxAmountWei}
      maxDescription="Locked CELO available"
      disabled={isWithdraw}
    />
  );
}

function ActionTypeField({ defaultAction }: { defaultAction?: LockActionType }) {
  const [, , helpers] = useField<LockActionType>('action');

  useEffect(() => {
    helpers.setValue(defaultAction || LockActionType.Lock).catch((e) => logger.error(e));
  }, [defaultAction, helpers]);

  return (
    <div role="group" className="flex items-center justify-between space-x-2 px-1">
      {Object.values(LockActionType).map((action) =>
        action !== LockActionType.Relock ? (
          <label key={action} className="flex items-center text-sm">
            <Field type="radio" name="action" value={action} className="radio mr-1.5" />
            {toTitleCase(action)}
          </label>
        ) : null,
      )}
    </div>
  );
}

function validateForm(
  values: LockFormValues,
  lockedBalances: LockedBalances,
  walletBalance: bigint,
  stakeBalances: StakingBalances,
  isVoting: boolean,
): FormikErrors<LockFormValues> {
  const { amount, action } = values;

  // TODO implement toWeiAdjusted() and use it here
  const amountWei = toWei(amount);
  if (!amountWei || amountWei <= 0n) {
    return { amount: 'Invalid amount' };
  }

  const maxAmountWei = getMaxAmount(action, lockedBalances, walletBalance);
  if (amountWei > maxAmountWei) {
    const errorMsg =
      action === LockActionType.Withdraw ? 'No pending available' : 'Amount exceeds max';
    return { amount: errorMsg };
  }

  // Special case handling for locking whole balance
  if (action === LockActionType.Lock) {
    const remainingAfterPending = amountWei - getTotalPendingCelo(lockedBalances);
    if (remainingAfterPending >= walletBalance) {
      return { amount: 'Cannot lock entire balance' };
    }
  }

  // Ensure user isn't trying to unlock CELO used for staking
  if (action === LockActionType.Unlock) {
    if (isVoting) {
      toast.warn(
        'Locked funds that have voted for a governance cannot be unlocked until the proposal is resolved.',
      );
      return { amount: 'Locked funds in use' };
    }

    const nonVotingLocked = getTotalNonvotingLocked(lockedBalances, stakeBalances);
    if (amountWei > nonVotingLocked) {
      toast.warn(
        'Locked funds that are current staked must be unstaked before they can be unlocked.',
      );
      return { amount: 'Locked funds in use' };
    }
  }

  return {};
}

function getMaxAmount(
  action: LockActionType,
  lockedBalances?: LockedBalances,
  walletBalance?: bigint,
) {
  if (action === LockActionType.Lock) {
    return getTotalUnlockedCelo(lockedBalances, walletBalance);
  } else if (action === LockActionType.Unlock) {
    return lockedBalances?.locked || 0n;
  } else if (action === LockActionType.Withdraw) {
    return lockedBalances?.pendingFree || 0n;
  } else {
    throw new Error(`Invalid lock action: ${action}`);
  }
}

const ActionToVerb: Partial<Record<LockActionType, string>> = {
  [LockActionType.Lock]: 'Locking',
  [LockActionType.Unlock]: 'Unlocking',
  [LockActionType.Withdraw]: 'Withdrawing',
};
