import { Form, Formik, FormikErrors, useField } from 'formik';
import { useEffect, useMemo } from 'react';
import { SolidButton } from 'src/components/buttons/SolidButton';
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
import { toWei } from 'src/utils/amount';
import { logger } from 'src/utils/logger';
import { toTitleCase } from 'src/utils/strings';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

interface LockFormValues {
  amount: number;
  type: LockActionType;
}

const initialValues: LockFormValues = {
  amount: 0,
  type: LockActionType.Lock,
};

export function LockForm({ defaultType }: { defaultType?: LockActionType }) {
  const { address } = useAccount();
  const { balance: walletBalance } = useBalance(address);
  const { lockedBalances } = useLockedStatus(address);
  const { stakeBalances } = useStakingBalances(address);
  const { isVoting } = useIsGovernanceVoting(address);

  const onSubmit = (values: LockFormValues) => {
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
        type: defaultType || initialValues.type,
      }}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ values }) => (
        <Form className="mt-2 flex w-full flex-col items-stretch space-y-4">
          <h2 className="font-serif text-2xl">Stake with a validator</h2>
          <ActionTypeField defaultType={defaultType} />
          <LockAmountField
            lockedBalances={lockedBalances}
            walletBalance={walletBalance}
            type={values.type}
          />
          <SolidButton type="submit">{toTitleCase(values.type)}</SolidButton>
        </Form>
      )}
    </Formik>
  );
}

function LockAmountField({
  lockedBalances,
  walletBalance,
  type,
}: {
  lockedBalances?: LockedBalances;
  walletBalance?: bigint;
  type: LockActionType;
}) {
  const maxAmountWei = useMemo(
    () => getMaxAmount(type, lockedBalances, walletBalance),
    [lockedBalances, walletBalance, type],
  );
  return <AmountField maxValueWei={maxAmountWei} maxDescription="Locked CELO available" />;
}

function ActionTypeField({ defaultType }: { defaultType?: LockActionType }) {
  const [field, , helpers] = useField<LockActionType>('type');

  useEffect(() => {
    helpers.setValue(defaultType || LockActionType.Lock).catch((e) => logger.error(e));
  }, [defaultType, helpers]);

  return (
    <div>
      <label htmlFor="type" className="pl-0.5 text-sm">
        type
      </label>
      <div>
        <select name="type" className="w-full" value={field.value}>
          {Object.values(LockActionType).map((type) => (
            <option key={type} value={type}>
              {toTitleCase(type)}
            </option>
          ))}
        </select>
      </div>
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
  const { amount, type } = values;

  // TODO implement toWeiAdjusted() and use it here
  const amountWei = toWei(amount);

  const maxAmountWei = getMaxAmount(type, lockedBalances, walletBalance);
  if (amountWei > maxAmountWei) {
    const errorMsg =
      type === LockActionType.Withdraw ? 'No pending available to withdraw' : 'Amount exceeds max';
    return { amount: errorMsg };
  }

  // Special case handling for locking whole balance
  if (type === LockActionType.Lock) {
    const remainingAfterPending = amountWei - getTotalPendingCelo(lockedBalances);
    if (remainingAfterPending >= walletBalance) {
      return { amount: 'Cannot lock entire balance' };
    }
  }

  // Ensure user isn't trying to unlock CELO used for staking
  if (type === LockActionType.Unlock) {
    if (isVoting) {
      return { amount: 'Locked funds have voted for governance' };
    }

    const nonVotingLocked = getTotalNonvotingLocked(lockedBalances, stakeBalances);
    if (amountWei > nonVotingLocked) {
      return { amount: 'Locked funds in use for staking' };
    }
  }

  return {};
}

function getMaxAmount(
  type: LockActionType,
  lockedBalances?: LockedBalances,
  walletBalance?: bigint,
) {
  if (type === LockActionType.Lock) {
    return getTotalUnlockedCelo(lockedBalances, walletBalance);
  } else if (type === LockActionType.Unlock) {
    return lockedBalances?.locked || 0n;
  } else if (type === LockActionType.Withdraw) {
    return lockedBalances?.pendingFree || 0n;
  } else {
    throw new Error(`Invalid lock type: ${type}`);
  }
}
