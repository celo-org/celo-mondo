import { Field, Form, Formik, FormikErrors, useField, useFormikContext } from 'formik';
import { SyntheticEvent, useCallback, useEffect, useMemo } from 'react';
import { IconButton } from 'src/components/buttons/IconButton';
import { MultiTxFormSubmitButton } from 'src/components/buttons/MultiTxFormSubmitButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { AmountField } from 'src/components/input/AmountField';
import { RadioField } from 'src/components/input/RadioField';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import {
  MAX_NUM_GROUPS_VOTED_FOR,
  MIN_GROUP_SCORE_FOR_RANDOM,
  ZERO_ADDRESS,
} from 'src/config/consts';
import { useVoteSignerToAccount } from 'src/features/account/hooks';
import { useDelegationBalances } from 'src/features/delegation/hooks/useDelegationBalances';
import { LockedBalances } from 'src/features/locking/types';
import { useLockedStatus } from 'src/features/locking/useLockedStatus';
import { submitStakeActivationRequest } from 'src/features/staking/autoActivation';
import { getStakeTxPlan } from 'src/features/staking/stakePlan';
import {
  GroupToStake,
  StakeActionType,
  StakeActionValues,
  StakeFormValues,
  StakingBalances,
} from 'src/features/staking/types';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanGroupName, getGroupStats } from 'src/features/validators/utils';

import ShuffleIcon from 'src/images/icons/shuffle.svg';
import { shortenAddress } from 'src/utils/addresses';
import { toWei } from 'src/utils/amount';
import { objLength } from 'src/utils/objects';
import { toTitleCase } from 'src/utils/strings';
import { TransactionReceipt } from 'viem';
import { useAccount } from 'wagmi';

const initialValues: StakeFormValues = {
  action: StakeActionType.Stake,
  amount: 0,
  group: ZERO_ADDRESS,
  transferGroup: ZERO_ADDRESS,
  delegate: false,
};

export function StakeForm({
  defaultFormValues,
  onConfirmed,
}: {
  defaultFormValues?: Partial<StakeFormValues>;
  onConfirmed: OnConfirmedFn;
}) {
  const { address } = useAccount();
  const { groups, addressToGroup } = useValidatorGroups();
  const { signingFor } = useVoteSignerToAccount(address);
  const { lockedBalances } = useLockedStatus(signingFor);
  const { stakeBalances, groupToStake, refetch } = useStakingBalances(signingFor);
  const { delegations } = useDelegationBalances(address, signingFor);

  const onPlanSuccess = (v: StakeFormValues, r: TransactionReceipt) => {
    if (v.action === StakeActionType.Stake) {
      submitStakeActivationRequest({
        address: address!,
        group: v.group,
        transactionHash: r.transactionHash,
      });
    }
    onConfirmed({
      message: `${v.action} successful`,
      amount: v.amount,
      receipt: r,
      properties: [
        { label: 'Action', value: toTitleCase(v.action) },
        { label: 'Group', value: addressToGroup?.[v.group]?.name || 'Unknown' },
        { label: 'Amount', value: `${v.amount} CELO` },
      ],
    });
  };

  const { getNextTx, txPlanIndex, numTxs, isPlanStarted, onTxSuccess } =
    useTransactionPlan<StakeFormValues>({
      createTxPlan: (v) => getStakeTxPlan(v, groups || [], groupToStake || {}),
      onStepSuccess: () => refetch(),
      onPlanSuccess,
    });

  const { writeContract, isLoading } = useWriteContractWithReceipt('staking', onTxSuccess);
  const isInputDisabled = isLoading || isPlanStarted;

  const onSubmit = (values: StakeFormValues) => writeContract(getNextTx(values));

  const validate = (values: StakeFormValues) => {
    if (!lockedBalances || !stakeBalances || !groupToStake || !addressToGroup) {
      return { amount: 'Form data not ready' };
    }
    if (txPlanIndex > 0) return {};
    return validateForm(values, lockedBalances, stakeBalances, groupToStake, addressToGroup);
  };

  return (
    <Formik<StakeFormValues>
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
        <Form className="mt-4 flex flex-1 flex-col justify-between" data-testid="stake-form">
          {/* Reserve space for group menu */}
          <div className="min-h-86 space-y-4">
            <ActionTypeField defaultAction={defaultFormValues?.action} disabled={isInputDisabled} />
            <GroupField
              fieldName="group"
              label={values.action === StakeActionType.Transfer ? 'From group' : 'Group'}
              addressToGroup={addressToGroup}
              defaultGroup={defaultFormValues?.group}
              disabled={isInputDisabled}
            />
            {values.action === StakeActionType.Transfer && (
              <GroupField
                fieldName="transferGroup"
                label="To group"
                addressToGroup={addressToGroup}
                disabled={isInputDisabled}
              />
            )}
            <StakeAmountField
              lockedBalances={lockedBalances}
              stakeBalances={stakeBalances}
              groupToStake={groupToStake}
              disabled={isInputDisabled}
            />
            {values.action === StakeActionType.Stake && delegations?.totalPercent === 0 && (
              <DelegateField disabled={isInputDisabled} />
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

function ActionTypeField({
  defaultAction,
  disabled,
}: {
  defaultAction?: StakeActionType;
  disabled?: boolean;
}) {
  return (
    <RadioField<StakeActionType>
      name="action"
      values={StakeActionValues}
      defaultValue={defaultAction}
      disabled={disabled}
    />
  );
}

function StakeAmountField({
  lockedBalances,
  stakeBalances,
  groupToStake,
  disabled,
}: {
  lockedBalances?: LockedBalances;
  stakeBalances?: StakingBalances;
  groupToStake?: GroupToStake;
  disabled?: boolean;
}) {
  const { values } = useFormikContext<StakeFormValues>();
  const { action, group } = values;
  const maxAmountWei = useMemo(
    () => getMaxAmount(action, group, lockedBalances, stakeBalances, groupToStake),
    [action, group, lockedBalances, stakeBalances, groupToStake],
  );

  return (
    <AmountField maxValueWei={maxAmountWei} maxDescription="CELO available" disabled={disabled} />
  );
}

function GroupField({
  fieldName,
  label,
  addressToGroup,
  defaultGroup,
  disabled,
}: {
  fieldName: 'group' | 'transferGroup';
  label: string;
  addressToGroup?: AddressTo<ValidatorGroup>;
  defaultGroup?: Address;
  disabled?: boolean;
}) {
  const [field, , helpers] = useField<Address>(fieldName);

  useEffect(() => {
    helpers.setValue(defaultGroup || ZERO_ADDRESS);
  }, [defaultGroup, helpers]);

  const currentGroup = addressToGroup?.[field.value];
  const groupName = currentGroup?.name
    ? cleanGroupName(currentGroup.name)
    : field.value && field.value !== ZERO_ADDRESS
      ? shortenAddress(field.value)
      : 'Select group';

  const sortedGroups = useMemo(() => {
    if (!addressToGroup) return [];
    return Object.values(addressToGroup)
      .map((g) => ({
        ...g,
        score: getGroupStats(g).score,
      }))
      .sort((a, b) => b.score - a.score);
  }, [addressToGroup]);

  const onClickRandom = useCallback(
    (event: SyntheticEvent) => {
      event.preventDefault();
      if (!sortedGroups?.length) return;
      const goodGroups = sortedGroups.filter((g) => g.score >= MIN_GROUP_SCORE_FOR_RANDOM);
      const randomGroup = goodGroups[Math.floor(Math.random() * goodGroups.length)];
      helpers.setValue(randomGroup.address);
    },
    [sortedGroups, helpers],
  );

  const onClickGroup = (address: Address) => helpers.setValue(address);

  return (
    <div className="relative space-y-1">
      <label htmlFor={fieldName} className="pl-0.5 text-xs font-medium">
        {label}
      </label>
      <DropdownMenu
        disabled={disabled}
        buttonClasses="w-full btn btn-outline border-taupe-300 px-3 hover:border-taupe-300 hover:bg-taupe-300/50 disabled:input-disabled"
        button={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center space-x-2">
              <ValidatorGroupLogo address={field.value} size={28} />
              <span className="text-black">{groupName}</span>
            </div>
            <ChevronIcon direction="s" width={14} height={14} />
          </div>
        }
        menuClasses="py-2 left-0 right-0 -top-22 overflow-y-auto max-h-99 all:w-auto divide-y divide-gray-200"
        menuHeader={
          <div className="flex items-center justify-between px-4 pb-2 text-sm">
            <span>Group</span>
            <span>Score</span>
          </div>
        }
        menuItems={sortedGroups.map((g) => {
          return (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between px-4 py-2 hover:bg-taupe-300/50"
              key={g.address}
              onClick={() => onClickGroup(g.address)}
            >
              <div className="flex items-center space-x-2">
                <ValidatorGroupLogo address={g.address} size={20} />
                <span>{cleanGroupName(g.name)}</span>
              </div>
              <span>{`${(g.score * 100).toFixed(2)}%`}</span>
            </button>
          );
        })}
      />
      {/* Placing shuffle button here to avoid button-in-button html error  */}
      <div className="absolute right-10 top-9 flex items-center space-x-4">
        <IconButton
          imgSrc={ShuffleIcon}
          width={14}
          height={10}
          title="Random"
          onClick={onClickRandom}
          className="px-1 py-1"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function DelegateField({ disabled }: { disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <label htmlFor="delegate" className="flex items-center space-x-2 pl-0.5 text-xs font-medium">
        <span>Delegate voting power</span>
        <HelpIcon text="You can allow this validator to participate in governance voting on your behalf. This delegation be changed at any time." />
      </label>
      <Field
        name="delegate"
        type="checkbox"
        className="checkbox-secondary checkbox"
        disabled={disabled}
      />
    </div>
  );
}

function validateForm(
  values: StakeFormValues,
  lockedBalances: LockedBalances,
  stakeBalances: StakingBalances,
  groupToStake: GroupToStake,
  addressToGroup: AddressTo<ValidatorGroup>,
): FormikErrors<StakeFormValues> {
  const { action, amount, group, transferGroup } = values;

  if (!group || group === ZERO_ADDRESS) return { group: 'Validator group required' };

  if (action === StakeActionType.Stake) {
    const groupDetails = addressToGroup[group];
    if (!groupDetails) return { group: 'Group not found' };
    if (groupDetails.votes >= groupDetails.capacity) return { group: 'Group has max votes' };
    if (!groupToStake[group] && objLength(groupToStake) >= MAX_NUM_GROUPS_VOTED_FOR)
      return { group: `Max number of groups is ${MAX_NUM_GROUPS_VOTED_FOR}` };
  }

  if (action === StakeActionType.Transfer) {
    if (!transferGroup || transferGroup === ZERO_ADDRESS)
      return { transferGroup: 'Transfer group required' };
    if (transferGroup === group) return { transferGroup: 'Groups must be different' };
    const groupDetails = addressToGroup[transferGroup];
    if (!groupDetails) return { group: 'Transfer group not found' };
    if (groupDetails.votes >= groupDetails.capacity)
      return { group: 'Transfer group has max votes' };
  }

  const amountWei = toWei(amount);
  if (!amountWei || amountWei <= 0n) return { amount: 'Invalid amount' };

  const maxAmountWei = getMaxAmount(action, group, lockedBalances, stakeBalances, groupToStake);
  if (amountWei > maxAmountWei) return { amount: 'Amount exceeds max' };

  return {};
}

function getMaxAmount(
  action: StakeActionType,
  groupAddress: Address,
  lockedBalances?: LockedBalances,
  stakeBalances?: StakingBalances,
  groupToStake?: GroupToStake,
) {
  if (action === StakeActionType.Stake) {
    return (lockedBalances?.locked || 0n) - (stakeBalances?.total || 0n);
  } else if (action === StakeActionType.Unstake || action === StakeActionType.Transfer) {
    if (!groupAddress || !groupToStake?.[groupAddress]) return 0n;
    return groupToStake[groupAddress].active + groupToStake[groupAddress].pending;
  } else {
    return 0n;
  }
}

const ActionToVerb: Partial<Record<StakeActionType, string>> = {
  [StakeActionType.Stake]: 'Staking',
  [StakeActionType.Transfer]: 'Transferring',
  [StakeActionType.Unstake]: 'Unstaking',
};

const ActionToTipText: Partial<Record<StakeActionType, string>> = {
  [StakeActionType.Stake]: 'One to stake and another to delegate.',
  [StakeActionType.Transfer]: 'Transfers require unstaking and then restaking.',
};
