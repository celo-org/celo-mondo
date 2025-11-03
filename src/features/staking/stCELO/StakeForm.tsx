import { Form, Formik, FormikErrors, useFormikContext } from 'formik';
import { useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MultiTxFormSubmitButton } from 'src/components/buttons/MultiTxFormSubmitButton';
import { AmountField } from 'src/components/input/AmountField';
import { RadioField } from 'src/components/input/RadioField';
import { TipBox } from 'src/components/layout/TipBox';
import { formatNumberString } from 'src/components/numbers/Amount';
import { MIN_REMAINING_BALANCE } from 'src/config/consts';
import { useBalance, useStCELOBalance } from 'src/features/account/hooks';
import {
  LiquidStakeActionType,
  LiquidStakeFormValues,
  StCeloActionValues,
} from 'src/features/locking/types';
import { useLockedStatus } from 'src/features/locking/useLockedStatus';
import { useExchangeRates } from 'src/features/staking/stCELO/hooks/useExchangeRates';
import { getStakeTxPlan } from 'src/features/staking/stCELO/stakeTxPlan';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { fromWei, toWei } from 'src/utils/amount';
import { toTitleCase } from 'src/utils/strings';
import { getHumanReadableDuration } from 'src/utils/time';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

const initialValues: LiquidStakeFormValues = {
  amount: 0,
  action: LiquidStakeActionType.Stake,
};

export function StakeStCeloForm({
  defaultFormValues,
  onConfirmed,
}: {
  defaultFormValues?: Partial<LiquidStakeFormValues>;
  showTip?: boolean;
  onConfirmed?: OnConfirmedFn;
}) {
  const { address } = useAccount();
  const { balance: walletBalance } = useBalance(address);
  const { unlockingPeriod } = useLockedStatus(address);
  const { stCELOBalances, isLoading: isLoadingStCELOBalances, refetch } = useStCELOBalance(address);
  const { stakeBalances } = useStakingBalances(address);

  const { getNextTx, txPlanIndex, numTxs, isPlanStarted, onTxSuccess } =
    useTransactionPlan<LiquidStakeFormValues>({
      createTxPlan: (v) => getStakeTxPlan(v),
      onStepSuccess: () => refetch(),
      onPlanSuccess: onConfirmed
        ? (v, r) =>
            onConfirmed({
              message: `${v.action} successful`,
              amount: v.amount,
              receipt: r,
              properties: [
                { label: 'Action', value: toTitleCase(v.action) },
                { label: 'Amount', value: `${v.amount} CELO` },
              ],
            })
        : undefined,
    });
  const { writeContract, isLoading } = useWriteContractWithReceipt('lock/unlock', onTxSuccess);
  const isInputDisabled = isLoading || isPlanStarted;

  const onSubmit = (values: LiquidStakeFormValues) => writeContract(getNextTx(values));

  const validate = (values: LiquidStakeFormValues) => {
    if (isNullish(walletBalance) || isLoadingStCELOBalances || !stakeBalances) {
      return { amount: 'Form data not ready' };
    }
    if (txPlanIndex > 0) return {};
    return validateForm(values, stCELOBalances, walletBalance);
  };

  const unlockingPeriodReadable = getHumanReadableDuration(Number((unlockingPeriod || 0n) * 1000n));

  return (
    <Formik<LiquidStakeFormValues>
      initialValues={{
        ...initialValues,
        ...defaultFormValues,
      }}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ values }) => (
        <Form className="mt-4 flex flex-1 flex-col justify-between" data-testid="lock-form">
          <div className="space-y-5">
            {values.action === LiquidStakeActionType.Unstake && (
              <TipBox color="purple">Unstaking takes {unlockingPeriodReadable}. </TipBox>
            )}
            <ActionTypeField defaultAction={defaultFormValues?.action} disabled={isInputDisabled} />
            <LockAmountField
              stCELOBalances={stCELOBalances}
              walletBalance={walletBalance}
              action={values.action}
              disabled={isInputDisabled}
            />
          </div>
          <MultiTxFormSubmitButton
            txIndex={txPlanIndex}
            numTxs={numTxs}
            isLoading={isLoading}
            loadingText={ActionToVerb[values.action]}
            tipText={ActionToTipText[values.action]}
          >
            {`${toTitleCase(values.action)}`}
          </MultiTxFormSubmitButton>
        </Form>
      )}
    </Formik>
  );
}
function ActionTypeField({
  defaultAction,
  disabled,
}: {
  defaultAction?: LiquidStakeActionType;
  disabled?: boolean;
}) {
  return (
    <RadioField<LiquidStakeActionType>
      name="action"
      values={StCeloActionValues}
      defaultValue={defaultAction}
      disabled={disabled}
    />
  );
}

function LockAmountField({
  stCELOBalances,
  walletBalance,
  action,
  disabled,
}: {
  stCELOBalances?: ReturnType<typeof useStCELOBalance>['stCELOBalances'];
  walletBalance?: bigint;
  action: LiquidStakeActionType;
  disabled?: boolean;
}) {
  const { stakingRate, unstakingRate } = useExchangeRates();
  const maxAmountWei = useMemo(
    () =>
      (getMaxAmount(action, stCELOBalances?.usable, walletBalance) || 0n) - MIN_REMAINING_BALANCE,
    [action, stCELOBalances, walletBalance],
  );
  const rate = action === LiquidStakeActionType.Stake ? stakingRate : unstakingRate;
  const { setFieldValue, values } = useFormikContext<LiquidStakeFormValues>();
  useEffect(() => {
    setFieldValue('amount', Math.max(0, fromWei(maxAmountWei - MIN_REMAINING_BALANCE)));
  }, [maxAmountWei, setFieldValue]);

  return (
    <div>
      <AmountField
        maxValueWei={maxAmountWei}
        maxDescription={`${action === LiquidStakeActionType.Stake ? '' : 'st'}CELO available`}
        disabled={disabled}
      />
      <div className="flex items-center justify-between pt-4">
        <label className="pl-0.5 text-xs font-medium">Receive</label>
        <strong className="text-xs">
          {rate != null ? formatNumberString(values.amount / rate, 5) : 'Loading exchange rate…'}{' '}
          {action === LiquidStakeActionType.Unstake ? '' : 'st'}CELO
        </strong>
      </div>
      <div className="flex items-center justify-between">
        <label className="pl-0.5 text-xs font-medium">Exchange Rate</label>
        <span className="text-xs">
          {action === LiquidStakeActionType.Stake ? stakingRate : unstakingRate}
        </span>
      </div>
    </div>
  );
}

function validateForm(
  values: LiquidStakeFormValues,
  stCELOBalances: ReturnType<typeof useStCELOBalance>['stCELOBalances'],
  walletBalance: bigint,
): FormikErrors<LiquidStakeFormValues> {
  const { action, amount } = values;

  // TODO implement toWeiAdjusted() and use it here
  const amountWei = toWei(amount);
  if (!amountWei || amountWei <= 0n) return { amount: 'Invalid amount' };

  const maxAmountWei = getMaxAmount(action, stCELOBalances.usable, walletBalance);
  if (!maxAmountWei || amountWei > maxAmountWei) {
    return { amount: 'Amount exceeds max' };
  }

  // Special case handling for locking whole balance
  if (action === LiquidStakeActionType.Stake) {
    const remainingAfterPending = amountWei - stCELOBalances.usable;
    if (walletBalance - remainingAfterPending <= MIN_REMAINING_BALANCE) {
      return { amount: 'Cannot lock entire balance' };
    }
  }

  // Ensure user isn't trying to unlock CELO used for staking
  if (action === LiquidStakeActionType.Unstake) {
    if (stCELOBalances.lockedVote > amountWei) {
      toast.warn(
        'Locked funds that have voted for a governance cannot be unlocked until the proposal is resolved.',
      );
      return { amount: 'Locked funds in use' };
    }

    const nonVotingBalance = stCELOBalances.usable;
    if (amountWei > nonVotingBalance) {
      toast.warn(
        'Locked funds that are current staked must be unstaked before they can be unlocked.',
      );
      return { amount: 'Locked funds in use' };
    }
  }

  return {};
}

function getMaxAmount(
  action: LiquidStakeActionType,
  stCELOBalance?: bigint,
  walletBalance?: bigint,
) {
  if (action === LiquidStakeActionType.Stake) {
    return walletBalance;
  } else if (action === LiquidStakeActionType.Unstake) {
    return stCELOBalance;
  } else {
    return 0n;
  }
}

const ActionToVerb: Record<LiquidStakeActionType, string> = {
  [LiquidStakeActionType.Stake]: 'Staking',
  [LiquidStakeActionType.Unstake]: 'Unstaking',
};

const ActionToTipText: Record<LiquidStakeActionType, string> = {
  // TODO
  [LiquidStakeActionType.Stake]: 'TODO: stake description',
  [LiquidStakeActionType.Unstake]: 'TODO: unstake description.',
};
