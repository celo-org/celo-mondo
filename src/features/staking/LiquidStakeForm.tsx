import { Form, Formik, FormikErrors, useField } from 'formik';
import { SyntheticEvent, useCallback, useEffect, useMemo } from 'react';
import { IconButton } from 'src/components/buttons/IconButton';
import { MultiTxFormSubmitButton } from 'src/components/buttons/MultiTxFormSubmitButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import { formatNumberString } from 'src/components/numbers/Amount';
import { MIN_GROUP_SCORE_FOR_RANDOM, ZERO_ADDRESS } from 'src/config/consts';
import { useStCeloBalance, useVoteSignerToAccount } from 'src/features/account/hooks';
import { getLiquidStakeTxPlan } from 'src/features/staking/liquidStakePlan';
import { useStrategy } from 'src/features/staking/stCelo/useStrategy';
import { LiquidStakeActionType, LiquidStakeFormValues } from 'src/features/staking/types';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanGroupName, getGroupStats } from 'src/features/validators/utils';

import ShuffleIcon from 'src/images/icons/shuffle.svg';
import { shortenAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { toTitleCase } from 'src/utils/strings';
import { TransactionReceipt } from 'viem';
import { useAccount } from 'wagmi';

const initialValues: LiquidStakeFormValues = {
  action: LiquidStakeActionType.ChangeStrategy,
  amount: 0n,
  group: ZERO_ADDRESS,
  transferGroup: ZERO_ADDRESS,
};

export function LiquidStakeForm({
  defaultFormValues,
  onConfirmed,
}: {
  defaultFormValues?: Partial<LiquidStakeFormValues>;
  onConfirmed: OnConfirmedFn;
}) {
  const { address } = useAccount();
  const { addressToGroup } = useValidatorGroups();
  const { signingFor } = useVoteSignerToAccount(address);
  const { stCeloBalance, refetch } = useStCeloBalance(signingFor);
  const { group } = useStrategy(signingFor);

  const humanReadableStCelo = formatNumberString(fromWei(stCeloBalance), 2);

  const onPlanSuccess = (v: LiquidStakeFormValues, r: TransactionReceipt) => {
    onConfirmed({
      message: `${v.action} successful`,
      amount: stCeloBalance,
      receipt: r,
      properties: [
        { label: 'Action', value: toTitleCase(v.action) },
        { label: 'Group', value: addressToGroup?.[v.transferGroup]?.name || 'Unknown' },
        { label: 'Amount', value: `${humanReadableStCelo} stCELO` },
      ],
    });
  };

  const { getNextTx, txPlanIndex, numTxs, isPlanStarted, onTxSuccess } =
    useTransactionPlan<LiquidStakeFormValues>({
      createTxPlan: (v) =>
        getLiquidStakeTxPlan({
          ...v,
          amount: stCeloBalance,
        }),
      onStepSuccess: () => refetch(),
      onPlanSuccess,
    });

  const { writeContract, isLoading } = useWriteContractWithReceipt('liquid staking', onTxSuccess);
  const isInputDisabled = isLoading || isPlanStarted;

  const onSubmit = (values: LiquidStakeFormValues) => writeContract(getNextTx(values));

  const validate = (values: LiquidStakeFormValues) => {
    if (!stCeloBalance || !addressToGroup) {
      return { amount: 'Form data not ready' };
    }
    if (txPlanIndex > 0) return {};
    return validateForm(values, stCeloBalance, addressToGroup);
  };

  console.log({ group });

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
        <Form className="mt-4 flex flex-1 flex-col justify-between" data-testid="stake-form">
          {/* Reserve space for group menu */}
          <div className="min-h-86 space-y-4">
            <GroupField
              fieldName="group"
              label="From group"
              addressToGroup={addressToGroup}
              defaultGroup={group || defaultFormValues?.group}
              disabled={true}
            />
            <GroupField
              fieldName="transferGroup"
              label="To group"
              addressToGroup={addressToGroup}
              disabled={isInputDisabled}
            />
            <div className="px-1">
              <span className="mono">TODO: {humanReadableStCelo} stCELO</span>
            </div>
          </div>
          <MultiTxFormSubmitButton
            txIndex={txPlanIndex}
            numTxs={numTxs}
            isLoading={isLoading}
            loadingText={ActionToVerb[values.action]}
            tipText={ActionToTipText[values.action]}
          >
            {`${toTitleCase(LiquidStakeActionType.ChangeStrategy)}`}
          </MultiTxFormSubmitButton>
        </Form>
      )}
    </Formik>
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
      : 'Default strategy';

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
              className="hover:bg-taupe-300/50 flex w-full cursor-pointer items-center justify-between px-4 py-2"
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

function validateForm(
  values: LiquidStakeFormValues,
  stCeloBalance: bigint,
  addressToGroup: AddressTo<ValidatorGroup>,
): FormikErrors<LiquidStakeFormValues> {
  const { group, transferGroup } = values;

  if (transferGroup === group) {
    return { transferGroup: 'Groups must be different' };
  }
  const groupDetails = addressToGroup[transferGroup];
  if (!groupDetails) {
    return { group: 'Transfer group not found' };
  }
  if (groupDetails.votes >= groupDetails.capacity) {
    return { group: 'Transfer group has max votes' };
  }

  if (!stCeloBalance || stCeloBalance <= 0n) {
    return { amount: 'Invalid amount' };
  }

  return {};
}

const ActionToVerb: Partial<Record<LiquidStakeActionType, string>> = {
  [LiquidStakeActionType.ChangeStrategy]: 'Changing strategy',
};

const ActionToTipText: Partial<Record<LiquidStakeActionType, string>> = {
  [LiquidStakeActionType.ChangeStrategy]: 'TODO: blah blah.',
};
