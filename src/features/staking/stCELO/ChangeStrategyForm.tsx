import { Form, Formik, FormikErrors, useField } from 'formik';
import { SyntheticEvent, useCallback, useEffect, useMemo } from 'react';
import { IconButton } from 'src/components/buttons/IconButton';
import { MultiTxFormSubmitButton } from 'src/components/buttons/MultiTxFormSubmitButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import { formatNumberString } from 'src/components/numbers/Amount';
import { MIN_GROUP_SCORE_FOR_RANDOM, ZERO_ADDRESS } from 'src/config/consts';
import { useStCELOBalance } from 'src/features/account/hooks';
import { changeStrategyTxPlan } from 'src/features/staking/stCELO/changeStrategyTxPlan';
import { useStrategy } from 'src/features/staking/stCELO/hooks/useStCELO';
import { ChangeStrategyFormValues, StCeloActionType } from 'src/features/staking/types';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { ValidatorGroup } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanGroupName, getGroupStats } from 'src/features/validators/utils';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';

import ShuffleIcon from 'src/images/icons/shuffle.svg';
import { shortenAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { toTitleCase } from 'src/utils/strings';
import { TransactionReceipt } from 'viem';
import { useAccount } from 'wagmi';

const initialValues: ChangeStrategyFormValues = {
  action: StCeloActionType.ChangeStrategy,
  amount: 0n,
  group: ZERO_ADDRESS,
  transferGroup: ZERO_ADDRESS,
};

export function ChangeStrategyForm({
  defaultFormValues,
  onConfirmed,
}: {
  defaultFormValues?: Partial<ChangeStrategyFormValues>;
  onConfirmed: OnConfirmedFn;
}) {
  const { address } = useAccount();
  const { addressToGroup } = useValidatorGroups(true);
  const { stCELOBalances } = useStCELOBalance(address);
  const { group: currentGroup, refetch: refetchStrategy } = useStrategy(address);

  const humanReadableStCelo = formatNumberString(fromWei(stCELOBalances.total), 2);

  const onPlanSuccess = (v: ChangeStrategyFormValues, r: TransactionReceipt) => {
    onConfirmed({
      message: `${v.action} successful`,
      amount: v.amount,
      receipt: r,
      properties: [
        { label: 'Action', value: toTitleCase(v.action) },
        { label: 'Group', value: addressToGroup?.[v.transferGroup]?.name || 'Unknown' },
        { label: 'Amount', value: `${humanReadableStCelo} stCELO` },
      ],
    });
  };

  const { getNextTx, txPlanIndex, numTxs, isPlanStarted, onTxSuccess } =
    useTransactionPlan<ChangeStrategyFormValues>({
      createTxPlan: (v) => changeStrategyTxPlan(v),
      onStepSuccess: () => refetchStrategy(),
      onPlanSuccess,
    });

  const { writeContract, isLoading } = useWriteContractWithReceipt('liquid staking', onTxSuccess);
  const isInputDisabled = isLoading || isPlanStarted;

  const onSubmit = (values: ChangeStrategyFormValues) => writeContract(getNextTx(values));

  const validate = (values: ChangeStrategyFormValues) => {
    if (!stCELOBalances.total || !addressToGroup) {
      return { amount: 'Form data not ready' };
    }
    if (txPlanIndex > 0) return {};
    return validateForm(values, stCELOBalances.total, addressToGroup);
  };
  return (
    <Formik<ChangeStrategyFormValues>
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
              defaultGroup={currentGroup}
              disabled={true}
            />
            <GroupField
              fieldName="transferGroup"
              label="To group"
              addressToGroup={addressToGroup}
              defaultGroup={defaultFormValues?.group ?? ZERO_ADDRESS}
              disabled={isInputDisabled}
            />
            <div className="flex items-center gap-2 px-1">
              <span className="mono">{humanReadableStCelo} stCELO</span>
              <HelpIcon
                type="tooltip"
                text="Your entire stCELO balance can only vote for one group at a time. Changing strategy will revote your full balance to the new group."
                size={14}
                position="above"
              />
            </div>
          </div>
          <MultiTxFormSubmitButton
            txIndex={txPlanIndex}
            numTxs={numTxs}
            isLoading={isLoading}
            loadingText={ActionToVerb[values.action]}
            tipText={ActionToTipText[values.action]}
          >
            {`${toTitleCase(StCeloActionType.ChangeStrategy)}`}
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
      .filter((g) => g.validStCeloGroup)
      .map((g) => ({
        ...g,
        score: getGroupStats(g).score,
      }))
      .sort((a, b) => {
        if (a.address === ZERO_ADDRESS) return -1;
        if (b.address === ZERO_ADDRESS) return 1;
        return b.score - a.score;
      });
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
          const isFull = g.address !== ZERO_ADDRESS && g.votes >= g.capacity;
          return (
            <button
              type="button"
              className={`flex w-full items-center justify-between px-4 py-2 ${
                isFull ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-taupe-300/50'
              }`}
              key={g.address}
              onClick={() => !isFull && onClickGroup(g.address)}
              disabled={isFull}
            >
              <div className="flex min-w-0 items-center space-x-2">
                <ValidatorGroupLogo address={g.address} size={20} />
                <span className="truncate">{cleanGroupName(g.name)}</span>
              </div>
              <span className="shrink-0 pl-2 text-xs text-taupe-600">
                {isFull ? 'Full' : `${(g.score * 100).toFixed(0)}%`}
              </span>
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
      {currentGroup && field.value !== ZERO_ADDRESS && currentGroup.capacity > 0n && (
        <span className="pl-0.5 text-xs text-taupe-600">
          Free capacity:{' '}
          {formatNumberString(
            fromWei(
              currentGroup.capacity > currentGroup.votes
                ? currentGroup.capacity - currentGroup.votes
                : 0n,
            ),
            0,
          )}{' '}
          CELO
        </span>
      )}
    </div>
  );
}

function validateForm(
  values: ChangeStrategyFormValues,
  stCELOBalance: bigint,
  addressToGroup: AddressTo<ValidatorGroup>,
): FormikErrors<ChangeStrategyFormValues> {
  const { group, transferGroup } = values;

  if (transferGroup === group) {
    return { transferGroup: 'Groups must be different' };
  }
  const groupDetails = addressToGroup[transferGroup];
  if (!groupDetails) {
    return { group: 'Transfer group not found' };
  }
  if (!groupDetails.validStCeloGroup) {
    return { group: 'Transfer group is not healthy' };
  }
  if (groupDetails.votes >= groupDetails.capacity) {
    return { group: 'Transfer group has max votes' };
  }

  if (!stCELOBalance || stCELOBalance <= 0n) {
    return { amount: 'Invalid amount' };
  }

  return {};
}

const ActionToVerb: Partial<Record<StCeloActionType, string>> = {
  [StCeloActionType.ChangeStrategy]: 'Changing strategy',
};

const ActionToTipText: Partial<Record<StCeloActionType, string>> = {};
