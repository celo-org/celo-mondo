import { Form, Formik, FormikErrors, useFormikContext } from 'formik';
import { useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MultiTxFormSubmitButton } from 'src/components/buttons/MultiTxFormSubmitButton';
import { AmountField } from 'src/components/input/AmountField';
import { TipBox } from 'src/components/layout/TipBox';
import { formatNumberString } from 'src/components/numbers/Amount';
import { MIN_REMAINING_BALANCE, ZERO_ADDRESS } from 'src/config/consts';
import { TokenId } from 'src/config/tokens';
import { useBalance, useStCELOBalance } from 'src/features/account/hooks';
import { LiquidStakeActionType, LiquidStakeFormValues } from 'src/features/locking/types';
import { useLockedStatus } from 'src/features/locking/useLockedStatus';
import { useExchangeRates } from 'src/features/staking/stCELO/hooks/useExchangeRates';
import { useStrategy } from 'src/features/staking/stCELO/hooks/useStCELO';
import { useWithdrawals } from 'src/features/staking/stCELO/hooks/useWithdrawals';
import { getStakeTxPlan } from 'src/features/staking/stCELO/stakeTxPlan';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { ValidatorGroupLogoAndName } from 'src/features/validators/ValidatorGroupLogo';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { getGroupStats } from 'src/features/validators/utils';
import { fromWei, toWei } from 'src/utils/amount';
import { afterDeposit, withdraw } from 'src/utils/stCELOAPI';
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
  showTip,
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
  const { startWaitingForNewWithdrawal } = useWithdrawals(address);
  const { group: strategyGroup } = useStrategy(address);
  const { addressToGroup } = useValidatorGroups(true);
  const showChangeStrategy = useTransactionModal(TransactionFlowType.ChangeStrategy);

  const changeStrategyDefaultGroup = useMemo(() => {
    if (!strategyGroup || strategyGroup !== ZERO_ADDRESS || !addressToGroup) return ZERO_ADDRESS;
    // Current strategy is already default (StCelo Basket), pick a random top group with free capacity
    const candidates = Object.values(addressToGroup)
      .filter((g) => g.validStCeloGroup && g.address !== ZERO_ADDRESS && g.votes < g.capacity)
      .map((g) => ({ ...g, score: getGroupStats(g).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    if (!candidates.length) return ZERO_ADDRESS;
    return candidates[Math.floor(Math.random() * candidates.length)].address;
  }, [strategyGroup, addressToGroup]);

  const { getNextTx, txPlanIndex, numTxs, isPlanStarted, onTxSuccess } =
    useTransactionPlan<LiquidStakeFormValues>({
      createTxPlan: (v) => getStakeTxPlan(v),
      onStepSuccess: () => refetch(),
      onPlanSuccess: async (v, r) => {
        void (async function callstCeloApi() {
          try {
            if (v.action === LiquidStakeActionType.Stake) {
              await afterDeposit();
            } else {
              startWaitingForNewWithdrawal();
              await withdraw(address!);
            }
          } catch (e) {
            console.error(`${v.action} error`, e);
          }
        })();

        return (
          onConfirmed &&
          onConfirmed({
            message: `${v.action} successful`,
            amount: v.amount,
            receipt: r,
            properties: [
              { label: 'Action', value: toTitleCase(v.action) },
              { label: 'Amount', value: `${v.amount} CELO` },
            ],
          })
        );
      },
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
        <Form className="mt-4 flex flex-1 flex-col justify-between gap-6" data-testid="lock-form">
          <div className="space-y-5">
            {showTip && (
              <TipBox color="purple">
                You currently have no stCELO. Liquid staking and governance requires funds. Stake
                stCELO to begin.
              </TipBox>
            )}
            {values.action === LiquidStakeActionType.Unstake && (
              <TipBox color="purple">
                Unstaking may take up to {unlockingPeriodReadable}. If unlocked CELO is available,
                it will be sent directly to your wallet.
              </TipBox>
            )}
            <LockAmountField
              stCELOBalances={stCELOBalances}
              walletBalance={walletBalance}
              action={values.action}
              disabled={isInputDisabled}
            />
            {strategyGroup && addressToGroup && (
              <div>
                <label className="pl-0.5 text-xs font-medium">Strategy</label>
                <button
                  type="button"
                  onClick={() =>
                    showChangeStrategy(undefined, { group: changeStrategyDefaultGroup })
                  }
                  className="mt-2 flex w-full items-center justify-between rounded-full border border-taupe-300 py-2 pl-3 pr-4 hover:bg-taupe-300/50"
                >
                  <ValidatorGroupLogoAndName
                    address={strategyGroup}
                    name={addressToGroup[strategyGroup]?.name}
                    size={24}
                  />
                  <span className="shrink-0 text-xs text-purple-500">Change</span>
                </button>
              </div>
            )}
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
    () => getMaxAmount(action, stCELOBalances?.usable, walletBalance) || 0n,
    [action, stCELOBalances, walletBalance],
  );
  const rate = action === LiquidStakeActionType.Stake ? stakingRate : unstakingRate;
  const { setFieldValue, values } = useFormikContext<LiquidStakeFormValues>();
  useEffect(() => {
    setFieldValue('amount', Math.max(0, fromWei(maxAmountWei)));
  }, [maxAmountWei, setFieldValue]);

  return (
    <div>
      <AmountField
        tokenId={TokenId.stCELO}
        maxWalletValueWei={maxAmountWei}
        maxDescription={`${action === LiquidStakeActionType.Stake ? '' : 'st'}CELO available`}
        disabled={disabled}
      />
      <div className="flex items-center justify-between pt-4">
        <label className="pl-0.5 text-xs font-medium">Receive</label>
        <strong className="text-xs">
          {rate != null ? formatNumberString(values.amount * rate, 5) : 'Loading exchange rate…'}{' '}
          {action === LiquidStakeActionType.Unstake ? '' : 'st'}CELO
        </strong>
      </div>
      <div className="flex items-center justify-between">
        <label className="pl-0.5 text-xs font-medium">Exchange Rate</label>
        <span className="text-xs">{rate != null ? formatNumberString(rate, 2) : 'Loading…'}</span>
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

  // Ensure user isn't trying to unlock stCELO used for staking
  if (action === LiquidStakeActionType.Unstake) {
    const nonVotingBalance = stCELOBalances.usable;
    if (amountWei > nonVotingBalance) {
      toast.warn(
        'Amount to unstake must not be greater than the unstakable stCelo. stCelo voting on proposals is locked while proposal is in flight.',
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
    return walletBalance ? walletBalance - MIN_REMAINING_BALANCE : walletBalance;
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
  [LiquidStakeActionType.Stake]:
    'stCelo tokens are automatically staked in a basket of 8 validator groups. You may switch groups later if you wish',
  [LiquidStakeActionType.Unstake]:
    'Withdrawal may be instant or take up to three days depending on available liquidity',
};
