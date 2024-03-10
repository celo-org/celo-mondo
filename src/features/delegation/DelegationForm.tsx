import { Form, Formik, FormikErrors, useFormikContext } from 'formik';
import { useEffect } from 'react';
import { MultiTxFormSubmitButton } from 'src/components/buttons/MultiTxFormSubmitButton';
import { RadioField } from 'src/components/input/RadioField';
import { RangeField } from 'src/components/input/RangeField';
import { TextField } from 'src/components/input/TextField';
import { MAX_NUM_DELEGATEES, ZERO_ADDRESS } from 'src/config/consts';
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
import { LockedBalances } from 'src/features/locking/types';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { cleanGroupName } from 'src/features/validators/utils';

import { isValidAddress, shortenAddress } from 'src/utils/addresses';
import { objLength } from 'src/utils/objects';
import { toTitleCase } from 'src/utils/strings';
import { useAccount } from 'wagmi';

const initialValues: DelegateFormValues = {
  action: DelegateActionType.Delegate,
  percent: 0,
  delegatee: '' as Address,
  transferDelegatee: '' as Address,
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
  const { delegations, refetch } = useDelegationBalances(address);

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
              value: addressToDelegatee?.[v.delegatee]?.name || shortenAddress(v.delegatee),
            },
            { label: 'Percent', value: `${v.percent} %` },
          ],
        }),
    });

  const { writeContract, isLoading } = useWriteContractWithReceipt('delegation', onTxSuccess);
  const isInputDisabled = isLoading || isPlanStarted;

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
      {({ values }) => (
        <Form className="mt-4 flex flex-1 flex-col justify-between">
          <div className="space-y-4">
            <ActionTypeField defaultAction={defaultFormValues?.action} disabled={isInputDisabled} />
            <DelegateeField
              fieldName="delegatee"
              label={
                values.action === DelegateActionType.Transfer ? 'From delegatee' : 'Delegate to'
              }
              addressToDelegatee={addressToDelegatee}
              defaultValue={defaultFormValues?.delegatee}
              disabled={isInputDisabled}
            />
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

function DelegateeField({
  fieldName,
  label,
  addressToDelegatee,
  defaultValue,
  disabled,
}: {
  fieldName: 'delegatee' | 'transferDelegatee';
  label: string;
  addressToDelegatee?: AddressTo<Delegatee>;
  defaultValue?: Address;
  disabled?: boolean;
}) {
  const { values, setFieldValue } = useFormikContext<DelegateFormValues>();
  useEffect(() => {
    setFieldValue(fieldName, defaultValue || '');
  }, [fieldName, defaultValue, setFieldValue]);

  const currentDelegatee = addressToDelegatee?.[values[fieldName]];
  const delegateeName = cleanGroupName(currentDelegatee?.name || '');

  return (
    <div className="relative flex flex-col space-y-1.5">
      <div className="flex justify-between">
        <label htmlFor={fieldName} className="pl-0.5 text-xs font-medium">
          {label}
        </label>
        {delegateeName && <div className="text-xs font-medium">{delegateeName}</div>}
      </div>
      <TextField name={fieldName} disabled={disabled} className="px-2 text-xs" />
    </div>
  );
}

function validateForm(
  values: DelegateFormValues,
  delegations: DelegationBalances,
): FormikErrors<DelegateFormValues> {
  const { action, percent, delegatee, transferDelegatee } = values;
  const { delegateeToAmount } = delegations;

  if (!delegatee || delegatee === ZERO_ADDRESS) return { delegatee: 'Delegatee required' };

  if (action === DelegateActionType.Delegate) {
    if (!isValidAddress(delegatee)) return { delegatee: 'Invalid address' };
    if (!delegateeToAmount[delegatee] && objLength(delegateeToAmount) >= MAX_NUM_DELEGATEES)
      return { delegatee: `Max number of delegatees is ${MAX_NUM_DELEGATEES}` };
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
  if (percent > maxPercent) return { percent: 'Percent exceeds max' };

  return {};
}

function getMaxPercent(
  action: DelegateActionType,
  delegatee: Address,
  delegations?: DelegationBalances,
) {
  if (action === DelegateActionType.Delegate) {
    return 100 - (delegations?.totalPercent || 0);
  } else if (action === DelegateActionType.Undelegate || action === DelegateActionType.Transfer) {
    if (!delegatee || !delegations?.delegateeToAmount[delegatee]) return 0;
    return delegations.delegateeToAmount[delegatee].percent;
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
