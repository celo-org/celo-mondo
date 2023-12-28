import { Form, Formik, useField, useFormikContext } from 'formik';
import { useEffect, useMemo } from 'react';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { NumberField } from 'src/components/input/NumberField';
import { formatNumberString } from 'src/components/numbers/Amount';
import { ZERO_ADDRESS } from 'src/config/consts';
import { useLockedBalance } from 'src/features/account/hooks';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { ValidatorGroup } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { fromWeiRounded } from 'src/utils/amount';
import { logger } from 'src/utils/logger';
import { bigIntMax } from 'src/utils/math';
import { useAccount } from 'wagmi';

interface StakeFormValues {
  amount: number;
  group: Address;
}

const initialValues: StakeFormValues = {
  amount: 0,
  group: ZERO_ADDRESS,
};

export function StakeForm({ defaultGroup }: { defaultGroup?: Address }) {
  const { address } = useAccount();
  const { groups } = useValidatorGroups();
  const { lockedBalance } = useLockedBalance(address);
  const { stakeBalances } = useStakingBalances(address);

  const availableLockedWei = bigIntMax(
    (lockedBalance?.value || 0n) - (stakeBalances?.total || 0n),
    0n,
  );

  const onSubmit = (values: StakeFormValues) => {
    alert(values);
  };

  const validate = (values: StakeFormValues) => {
    alert(values);
  };

  return (
    <Formik<StakeFormValues>
      initialValues={{
        ...initialValues,
        group: defaultGroup || initialValues.group,
      }}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      <Form className="mt-2 flex w-full flex-col items-stretch space-y-4">
        <h2 className="font-serif text-2xl">Stake with a validator</h2>
        <AmountField availableLockedWei={availableLockedWei} />
        <GroupField groups={groups} defaultGroup={defaultGroup} />
        <SolidButton type="submit">Stake</SolidButton>
      </Form>
    </Formik>
  );
}

function AmountField({ availableLockedWei }: { availableLockedWei: bigint }) {
  const { setFieldValue } = useFormikContext();

  const availableLocked = useMemo(() => fromWeiRounded(availableLockedWei), [availableLockedWei]);

  const onClickMax = async () => {
    await setFieldValue('amount', availableLocked);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="amount" className="pl-0.5 text-sm">
          Amount
        </label>
        <span className="text-xs">
          {`${formatNumberString(availableLocked, 2)} Locked CELO available`}
        </span>
      </div>
      <div className="relative mt-2">
        <NumberField name="amount" className="w-full all:py-3" />
        <div className="absolute right-1 top-2 z-10">
          <OutlineButton onClick={onClickMax} type="button">
            Max
          </OutlineButton>
        </div>
      </div>
    </div>
  );
}

function GroupField({
  groups,
  defaultGroup,
}: {
  groups?: ValidatorGroup[];
  defaultGroup?: Address;
}) {
  const [field, , helpers] = useField<Address>('group');

  useEffect(() => {
    helpers.setValue(defaultGroup || ZERO_ADDRESS).catch((e) => logger.error(e));
  }, [defaultGroup, helpers]);

  return (
    <div>
      <label htmlFor="group" className="pl-0.5 text-sm">
        Group
      </label>
      <div>
        <select name="group" className="w-full" value={field.value}>
          {(groups || []).map((group) => (
            <option key={group.address} value={group.address}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
