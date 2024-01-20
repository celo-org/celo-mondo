import { lockedGoldABI } from '@celo/abis';
import { Field, Form, Formik, FormikErrors, useField, useFormikContext } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FormSubmitButton } from 'src/components/buttons/FormSubmitButton';
import { AmountField } from 'src/components/input/AmountField';
import { TipBox } from 'src/components/layout/TipBox';
import { MIN_REMAINING_BALANCE } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useBalance } from 'src/features/account/hooks';
import { useIsGovernanceVoting } from 'src/features/governance/useVotingStatus';
import { getLockActionTxPlan } from 'src/features/locking/lockPlan';
import {
  LockActionType,
  LockFormValues,
  LockedBalances,
  PendingWithdrawal,
} from 'src/features/locking/types';
import { useLockedStatus } from 'src/features/locking/useLockedStatus';
import {
  getTotalNonvotingLocked,
  getTotalPendingCelo,
  getTotalUnlockedCelo,
} from 'src/features/locking/utils';
import { StakingBalances } from 'src/features/staking/types';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { useWriteContractWithReceipt } from 'src/features/transactions/hooks';
import { fromWeiRounded, toWei } from 'src/utils/amount';
import { logger } from 'src/utils/logger';
import { toTitleCase } from 'src/utils/strings';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

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
  const { lockedBalances, pendingWithdrawals, refetch } = useLockedStatus(address);
  const { stakeBalances } = useStakingBalances(address);
  const { isVoting } = useIsGovernanceVoting(address);

  const { writeContract, isLoading } = useWriteContractWithReceipt('lock/unlock', refetch);

  const [transactionPlanIndex, setTransactionPlanIndex] = useState(0);
  const isInputDisabled = isLoading || transactionPlanIndex > 0;

  const onSubmit = (values: LockFormValues) => {
    if (!address || !pendingWithdrawals || !stakeBalances) return;
    const txPlan = getLockActionTxPlan(values, pendingWithdrawals, stakeBalances);
    const nextTx = txPlan[transactionPlanIndex] as any;
    writeContract(
      {
        address: Addresses.LockedGold,
        abi: lockedGoldABI,
        ...nextTx,
      },
      {
        onSuccess: () => {
          if (transactionPlanIndex >= txPlan.length - 1) {
            setTransactionPlanIndex(0);
          } else {
            setTransactionPlanIndex(transactionPlanIndex + 1);
          }
        },
      },
    );
  };

  const validate = (values: LockFormValues) => {
    if (isNullish(walletBalance) || !lockedBalances || !stakeBalances || isNullish(isVoting)) {
      return { amount: 'Form data not ready' };
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
          <div className="space-y-5">
            {showTip && (
              <TipBox color="purple">
                You currently have no locked CELO. Only locked funds can participate in staking.
                Lock CELO to begin.
              </TipBox>
            )}
            <ActionTypeField defaultAction={defaultAction} disabled={isInputDisabled} />
            <LockAmountField
              lockedBalances={lockedBalances}
              walletBalance={walletBalance}
              action={values.action}
              disabled={isInputDisabled}
            />
          </div>
          <ButtonSection
            pendingWithdrawals={pendingWithdrawals}
            stakeBalances={stakeBalances}
            transactionPlanIndex={transactionPlanIndex}
            isLoading={isLoading}
          />
        </Form>
      )}
    </Formik>
  );
}
function ActionTypeField({
  defaultAction,
  disabled,
}: {
  defaultAction?: LockActionType;
  disabled?: boolean;
}) {
  const [, , helpers] = useField<LockActionType>('action');

  useEffect(() => {
    helpers.setValue(defaultAction || LockActionType.Lock).catch((e) => logger.error(e));
  }, [defaultAction, helpers]);

  return (
    <div role="group" className="flex items-center justify-between space-x-6 px-1">
      {Object.values(LockActionType).map((action) => (
        <label key={action} className="flex items-center text-sm">
          <Field
            type="radio"
            name="action"
            value={action}
            className="radio mr-1.5"
            disabled={disabled}
          />
          {toTitleCase(action)}
        </label>
      ))}
    </div>
  );
}

function LockAmountField({
  lockedBalances,
  walletBalance,
  action,
  disabled,
}: {
  lockedBalances?: LockedBalances;
  walletBalance?: bigint;
  action: LockActionType;
  disabled?: boolean;
}) {
  const maxAmountWei = useMemo(
    () => getMaxAmount(action, lockedBalances, walletBalance),
    [action, lockedBalances, walletBalance],
  );

  // Auto set amount for withdraw action
  const isWithdraw = action === LockActionType.Withdraw;
  const { setFieldValue } = useFormikContext<LockFormValues>();
  useEffect(() => {
    if (!isWithdraw) return;
    setFieldValue('amount', fromWeiRounded(maxAmountWei)).catch((e) => logger.error(e));
  }, [maxAmountWei, isWithdraw, setFieldValue]);

  return (
    <AmountField
      maxValueWei={maxAmountWei}
      maxDescription="CELO available"
      disabled={disabled || isWithdraw}
    />
  );
}

function ButtonSection({
  pendingWithdrawals,
  stakeBalances,
  transactionPlanIndex,
  isLoading,
}: {
  pendingWithdrawals?: PendingWithdrawal[];
  stakeBalances?: StakingBalances;
  transactionPlanIndex: number;
  isLoading: boolean;
}) {
  const { values } = useFormikContext<LockFormValues>();

  const numTxs = useMemo(() => {
    try {
      if (!pendingWithdrawals || !stakeBalances) return 0;
      return getLockActionTxPlan(values, pendingWithdrawals, stakeBalances).length;
    } catch (error) {
      logger.debug('Error getting lock plan', error);
      return 0;
    }
  }, [values, pendingWithdrawals, stakeBalances]);

  const txIndexString = numTxs > 1 ? ` (${transactionPlanIndex + 1} / ${numTxs})` : '';

  return (
    <div className="flex flex-col space-y-2">
      {numTxs > 1 && (
        <TipBox color="yellow">
          {`This action will require ${numTxs} transactions. ${ActionToTipText[values.action]}`}
        </TipBox>
      )}
      <FormSubmitButton
        isLoading={isLoading}
        loadingText={`${ActionToVerb[values.action]} ${txIndexString}`}
      >
        {`${toTitleCase(values.action)} ${txIndexString}`}
      </FormSubmitButton>
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
    if (walletBalance - remainingAfterPending <= MIN_REMAINING_BALANCE) {
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

const ActionToTipText: Partial<Record<LockActionType, string>> = {
  [LockActionType.Lock]: 'Pending unlocked amounts must be re-locked first.',
  [LockActionType.Unlock]:
    'Unlocking requires revoking staking, governance, and delegation votes first.',
  [LockActionType.Withdraw]: 'Pending unlocked amounts must be withdrawn in their entirety.',
};
