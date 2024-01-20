import { lockedGoldABI } from '@celo/abis';
import { Form, Formik, FormikErrors, useFormikContext } from 'formik';
import { useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MultiTxFormSubmitButton } from 'src/components/buttons/MultiTxFormSubmitButton';
import { AmountField } from 'src/components/input/AmountField';
import { RadioField } from 'src/components/input/RadioField';
import { TipBox } from 'src/components/layout/TipBox';
import { MIN_REMAINING_BALANCE } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useBalance } from 'src/features/account/hooks';
import { useIsGovernanceVoting } from 'src/features/governance/useVotingStatus';
import { getLockActionTxPlan } from 'src/features/locking/lockPlan';
import {
  LockActionType,
  LockActionValues,
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
import {
  useTransactionPlanCounter,
  useWriteContractWithReceipt,
} from 'src/features/transactions/hooks';
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
  const { txPlanIndex, isPlanStarted, onTxSuccess } = useTransactionPlanCounter(isLoading);

  const onSubmit = (values: LockFormValues) => {
    if (!address || !pendingWithdrawals || !stakeBalances) return;
    const txPlan = getLockActionTxPlan(values, pendingWithdrawals, stakeBalances);
    const nextTx = txPlan[txPlanIndex] as any;
    writeContract(
      {
        address: Addresses.LockedGold,
        abi: lockedGoldABI,
        ...nextTx,
      },
      { onSuccess: () => onTxSuccess(txPlan.length) },
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
        <Form className="mt-4 flex flex-1 flex-col justify-between">
          <div className="space-y-5">
            {showTip && (
              <TipBox color="purple">
                You currently have no locked CELO. Only locked funds can participate in staking.
                Lock CELO to begin.
              </TipBox>
            )}
            <ActionTypeField defaultAction={defaultAction} disabled={isPlanStarted} />
            <LockAmountField
              lockedBalances={lockedBalances}
              walletBalance={walletBalance}
              action={values.action}
              disabled={isPlanStarted}
            />
          </div>
          <ButtonSection
            pendingWithdrawals={pendingWithdrawals}
            stakeBalances={stakeBalances}
            txPlanIndex={txPlanIndex}
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
  return (
    <RadioField<LockActionType>
      name="action"
      values={LockActionValues}
      defaultValue={defaultAction}
      disabled={disabled}
    />
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
  txPlanIndex,
  isLoading,
}: {
  pendingWithdrawals?: PendingWithdrawal[];
  stakeBalances?: StakingBalances;
  txPlanIndex: number;
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

  return (
    <MultiTxFormSubmitButton
      txIndex={txPlanIndex}
      numTxs={numTxs}
      isLoading={isLoading}
      loadingText={ActionToVerb[values.action]}
      tipText={ActionToTipText[values.action]}
    >
      {`${toTitleCase(values.action)}`}
    </MultiTxFormSubmitButton>
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
