import { Form, Formik, FormikErrors, useField, useFormikContext } from 'formik';
import { SyntheticEvent, useCallback, useEffect, useMemo } from 'react';
import { IconButton } from 'src/components/buttons/IconButton';
import { MultiTxFormSubmitButton } from 'src/components/buttons/MultiTxFormSubmitButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { RadioField } from 'src/components/input/RadioField';
import { RangeField } from 'src/components/input/RangeField';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import { formatNumberString } from 'src/components/numbers/Amount';
import { MAX_NUM_DELEGATEES, ZERO_ADDRESS } from 'src/config/consts';
import { useAccountDetails, useVoteSignerToAccount } from 'src/features/account/hooks';
import { DelegateeLogo } from 'src/features/delegation/components/DelegateeLogo';
import { getDelegateTxPlan } from 'src/features/delegation/delegatePlan';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { useDelegationBalances } from 'src/features/delegation/hooks/useDelegationBalances';
import {
  DelegateActionType,
  DelegateActionValues,
  DelegateFormValues,
  Delegatee,
  DelegationBalances,
} from 'src/features/delegation/types';
import { isAddressAnAccount } from 'src/features/delegation/utils';
import { LockedBalances } from 'src/features/locking/types';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { cleanDelegateeName } from 'src/features/validators/utils';

import ShuffleIcon from 'src/images/icons/shuffle.svg';
import { ensure0x, isValidAddress } from 'src/utils/addresses';
import { objLength } from 'src/utils/objects';
import { toTitleCase } from 'src/utils/strings';
import useAddressToLabel from 'src/utils/useAddressToLabel';
import { useAccount } from 'wagmi';

const initialValues: DelegateFormValues = {
  action: DelegateActionType.Delegate,
  percent: 0,
  delegatee: '' as Address,
  transferDelegatee: '' as Address,
  customDelegatee: false,
};

export function DelegationForm({
  defaultFormValues,
  onConfirmed,
}: {
  defaultFormValues?: Partial<DelegateFormValues>;
  onConfirmed: OnConfirmedFn;
}) {
  const { address } = useAccount();
  const { addressToDelegatee } = useDelegatees();
  const addressToLabel = useAddressToLabel();
  const { isValidator, isValidatorGroup } = useAccountDetails(address);
  const { signingFor } = useVoteSignerToAccount(address);
  const { delegations, refetch } = useDelegationBalances(address, signingFor);
  const { isValidator: isVoteSignerForValidator, isValidatorGroup: isVoteSignerForValidatorGroup } =
    useAccountDetails(signingFor);

  const { getNextTx, txPlanIndex, numTxs, isPlanStarted, onTxSuccess } =
    useTransactionPlan<DelegateFormValues>({
      createTxPlan: (v) => getDelegateTxPlan(v),
      onStepSuccess: () => refetch(),
      onPlanSuccess: (v, r) =>
        onConfirmed({
          message: `${v.action} successful`,
          receipt: r,
          properties: [
            { label: 'Action', value: toTitleCase(v.action) },
            {
              label: 'Delegatee',
              value: addressToLabel(v.delegatee),
            },
            { label: 'Percent', value: `${v.percent} %` },
          ],
        }),
    });

  const { writeContract, isLoading } = useWriteContractWithReceipt('delegation', onTxSuccess);
  const isInputDisabled = isLoading || isPlanStarted;
  const canDelegate =
    !isValidator &&
    !isValidatorGroup &&
    !isVoteSignerForValidator &&
    !isVoteSignerForValidatorGroup;

  const onSubmit = (values: DelegateFormValues) => writeContract(getNextTx(values));

  const validate = (values: DelegateFormValues) => {
    if (!delegations) return { amount: 'Form data not ready' };
    if (txPlanIndex > 0) return {};
    return validateForm(values, delegations);
  };

  return (
    <Formik<DelegateFormValues>
      initialValues={{
        ...initialValues,
        ...defaultFormValues,
      }}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ values, setFieldValue }) => (
        <Form
          className="mt-4 flex flex-1 flex-col justify-between space-y-3"
          data-testid="delegate-form"
        >
          <div
            className={values.action === DelegateActionType.Transfer ? 'space-y-3' : 'space-y-5'}
          >
            <ActionTypeField defaultAction={defaultFormValues?.action} disabled={isInputDisabled} />
            <div className="space-y-1">
              <DelegateeField
                fieldName="delegatee"
                label={
                  values.action === DelegateActionType.Transfer ? 'From delegatee' : 'Delegate to'
                }
                addressToDelegatee={addressToDelegatee}
                defaultValue={defaultFormValues?.delegatee}
                allowUserInput={values.customDelegatee}
                disabled={isInputDisabled}
              />
              <div className="mb-4 flex items-center">
                <input
                  id="default-checkbox"
                  type="checkbox"
                  value={values.customDelegatee ? 'true' : ''}
                  onChange={() => setFieldValue('customDelegatee', !values.customDelegatee)}
                  className="h-4 w-4 rounded-sm border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                />
                <label
                  htmlFor="default-checkbox"
                  className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                >
                  Check to use a private delegatee address
                </label>
              </div>
              <CurrentPercentField delegations={delegations} />
            </div>
            {values.action === DelegateActionType.Transfer && (
              <DelegateeField
                fieldName="transferDelegatee"
                label="To delegatee"
                addressToDelegatee={addressToDelegatee}
                disabled={isInputDisabled}
              />
            )}
            <PercentField delegations={delegations} disabled={isInputDisabled} />
          </div>

          {
            <MultiTxFormSubmitButton
              txIndex={txPlanIndex}
              numTxs={numTxs}
              isLoading={isLoading}
              loadingText={ActionToVerb[values.action]}
              tipText={ActionToTipText[values.action]}
              disabled={!canDelegate}
              data-testid="delegate-form-submit"
            >
              {`${toTitleCase(values.action)}`}
            </MultiTxFormSubmitButton>
          }

          {!canDelegate && (
            <p
              className={'min-w-[18rem] max-w-sm text-xs text-red-600'}
              data-testid="delegate-form-warning"
            >
              Validators and validator groups (as well as their signers) cannot delegate their
              voting power.
            </p>
          )}
        </Form>
      )}
    </Formik>
  );
}

function ActionTypeField({
  defaultAction,
  disabled,
}: {
  defaultAction?: DelegateActionType;
  disabled?: boolean;
}) {
  return (
    <RadioField<DelegateActionType>
      name="action"
      values={DelegateActionValues}
      defaultValue={defaultAction}
      disabled={disabled}
    />
  );
}

function DelegateeField({
  fieldName,
  label,
  addressToDelegatee,
  defaultValue,
  disabled,
  allowUserInput,
}: {
  fieldName: 'delegatee' | 'transferDelegatee';
  label: string;
  addressToDelegatee?: AddressTo<Delegatee>;
  defaultValue?: Address;
  disabled?: boolean;
  allowUserInput?: boolean;
}) {
  const [field, , helpers] = useField<Address>(fieldName);
  useEffect(() => {
    helpers.setValue(defaultValue || ZERO_ADDRESS);
  }, [defaultValue, helpers]);

  const { setFieldValue } = useFormikContext<DelegateFormValues>();
  useEffect(() => {
    setFieldValue(fieldName, defaultValue || '');
  }, [fieldName, defaultValue, setFieldValue]);

  const currentDelegatee = addressToDelegatee?.[field.value];
  const delegateeName = currentDelegatee?.name
    ? cleanDelegateeName(currentDelegatee.name)
    : field.value && field.value !== ZERO_ADDRESS
      ? field.value
      : 'Select delegatee';

  const sortedDelegatees = useMemo(() => {
    if (!addressToDelegatee) return [];
    return Object.values(addressToDelegatee).sort((a, b) => Number(b.votingPower - a.votingPower));
  }, [addressToDelegatee]);

  const onClickRandom = useCallback(
    (event: SyntheticEvent) => {
      event.preventDefault();
      if (!sortedDelegatees?.length) return;
      const goodGroups = sortedDelegatees.filter((g) => g.votingPower > 0);
      const randomGroup = goodGroups[Math.floor(Math.random() * goodGroups.length)];
      helpers.setValue(randomGroup.address);
    },
    [sortedDelegatees, helpers],
  );

  const onClickDelegatee = (address: Address) => helpers.setValue(address);

  if (allowUserInput) {
    return (
      <div className="relative space-y-1">
        <label htmlFor={fieldName} className="pl-0.5 text-xs font-medium">
          {label}
        </label>
        <input
          id="custom-delegatee-address"
          className="btn btn-outline w-full border-taupe-300 px-3 text-left disabled:input-disabled hover:border-taupe-300 hover:bg-white hover:text-black"
          value={field.value}
          onPaste={(evt) => {
            evt.preventDefault();
            helpers.setValue(ensure0x(evt.clipboardData.getData('text')), false);
          }}
          onChange={(evt) => {
            helpers.setValue(ensure0x(evt.target.value), false);
          }}
        />
      </div>
    );
  }

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
              <DelegateeLogo address={field.value} size={28} />
              <span className="text-black">{delegateeName}</span>
            </div>
            <ChevronIcon direction="s" width={14} height={14} />
          </div>
        }
        menuClasses="py-2 left-0 right-0 -top-[5.5rem] overflow-y-auto max-h-[24.75rem] all:w-auto divide-y divide-gray-200"
        menuHeader={
          <div className="flex items-center justify-between px-4 pb-2 text-sm">
            <span>Group</span>
            <span>Delegated</span>
          </div>
        }
        menuItems={sortedDelegatees.map((d) => {
          return (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between px-4 py-2 hover:bg-taupe-300/50"
              key={d.address}
              onClick={() => onClickDelegatee(d.address)}
            >
              <div className="flex items-center space-x-2">
                <DelegateeLogo address={d.address} size={20} />
                <span>{cleanDelegateeName(d.name)}</span>
              </div>
              <span>{`${formatNumberString(d.votingPower, 0, true)} CELO`}</span>
            </button>
          );
        })}
      />
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

function CurrentPercentField({ delegations }: { delegations?: DelegationBalances }) {
  const { values } = useFormikContext<DelegateFormValues>();

  const currentPercent = delegations?.delegateeToAmount[values.delegatee]?.percent || 0;

  return (
    <div className="flex items-center justify-between bg-purple-100 px-1 py-0.5">
      <label className="text-xs">Current delegation:</label>
      <span className="text-xs">{`${currentPercent}%`}</span>
    </div>
  );
}

function PercentField({
  delegations,
  disabled,
}: {
  lockedBalances?: LockedBalances;
  delegations?: DelegationBalances;
  disabled?: boolean;
}) {
  const { values } = useFormikContext<DelegateFormValues>();
  const { action, delegatee } = values;
  const maxPercent = getMaxPercent(action, delegatee, delegations);

  return (
    <RangeField
      name="percent"
      label={`${values.percent}% voting power`}
      maxValue={maxPercent}
      maxDescription="Available:"
      disabled={disabled}
    />
  );
}

async function validateForm(
  values: DelegateFormValues,
  delegations: DelegationBalances,
): Promise<FormikErrors<DelegateFormValues>> {
  const { action, percent, delegatee, transferDelegatee } = values;
  const { delegateeToAmount } = delegations;

  if (!delegatee || delegatee === ZERO_ADDRESS) return { delegatee: 'Delegatee required' };

  if (action === DelegateActionType.Delegate) {
    if (!isValidAddress(delegatee)) {
      return { delegatee: 'Invalid address' };
    }
    if (!(await isAddressAnAccount(delegatee))) {
      return { delegatee: 'Address must be registered as an Account.' };
    }

    const currentAmount = delegateeToAmount[delegatee];
    if (!currentAmount && objLength(delegateeToAmount) >= MAX_NUM_DELEGATEES)
      return { delegatee: `Max number of delegatees is ${MAX_NUM_DELEGATEES}` };
    if (currentAmount?.percent && percent <= currentAmount.percent)
      return { delegatee: 'New delegation % must be more than current' };
  }

  if (action === DelegateActionType.Transfer) {
    if (!transferDelegatee || transferDelegatee === ZERO_ADDRESS)
      return { transferDelegatee: 'Transfer group required' };
    if (!isValidAddress(transferDelegatee))
      return { transferDelegatee: 'Invalid transfer address' };
    if (transferDelegatee === delegatee)
      return { transferDelegatee: 'Delegatees must be different' };
  }

  if (!percent || percent <= 0 || percent > 100) return { percent: 'Invalid percent' };
  const maxPercent = getMaxPercent(action, delegatee, delegations);
  if (percent > maxPercent) return { percent: `Percent exceeds max (${maxPercent}%)` };

  return {};
}

function getMaxPercent(
  action: DelegateActionType,
  delegatee: Address,
  delegations?: DelegationBalances,
) {
  const currentPercent = delegations?.delegateeToAmount[delegatee]?.percent || 0;
  if (action === DelegateActionType.Delegate) {
    return 100 - (delegations?.totalPercent || 0) + currentPercent;
  } else if (action === DelegateActionType.Undelegate || action === DelegateActionType.Transfer) {
    if (!delegatee || !currentPercent) return 0;
    return currentPercent;
  } else {
    return 0;
  }
}

const ActionToVerb: Partial<Record<DelegateActionType, string>> = {
  [DelegateActionType.Delegate]: 'Delegating',
  [DelegateActionType.Transfer]: 'Transferring',
  [DelegateActionType.Undelegate]: 'Undelegating',
};

const ActionToTipText: Partial<Record<DelegateActionType, string>> = {
  [DelegateActionType.Transfer]: 'Transfers require undelegating and then redelegating.',
};
