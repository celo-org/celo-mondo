import { Form, Formik, useField } from 'formik';
import { useEffect } from 'react';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { AmountField } from 'src/components/input/AmountField';
import { ZERO_ADDRESS } from 'src/config/consts';
import { useLockedBalance } from 'src/features/account/hooks';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { ValidatorGroup } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
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

  const availableLockedWei = bigIntMax((lockedBalance || 0n) - (stakeBalances?.total || 0n), 0n);

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
        <StakeAmountField availableLockedWei={availableLockedWei} />
        <GroupField groups={groups} defaultGroup={defaultGroup} />
        <SolidButton type="submit">Stake</SolidButton>
      </Form>
    </Formik>
  );
}

function StakeAmountField({ availableLockedWei }: { availableLockedWei: bigint }) {
  return <AmountField maxValueWei={availableLockedWei} maxDescription="Locked CELO available" />;
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
