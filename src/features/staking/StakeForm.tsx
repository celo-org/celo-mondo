import { Form, Formik } from 'formik';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { NumberField } from 'src/components/input/NumberField';
import { formatNumberString } from 'src/components/numbers/Amount';
import { ZERO_ADDRESS } from 'src/config/consts';
import { useLockedBalance } from 'src/features/account/hooks';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { logger } from 'src/utils/logger';
import { useAccount } from 'wagmi';

interface StakeFormValues {
  amount: number;
  group: Address;
}

const initialValues: StakeFormValues = {
  amount: 0,
  group: ZERO_ADDRESS,
};

export function StakeForm() {
  const { address } = useAccount();
  const { groups } = useValidatorGroups();
  const { lockedBalance } = useLockedBalance(address);
  const { stakes } = useStakingBalances(address);

  const onSubmit = (values: StakeFormValues) => {
    alert(values);
    logger.debug(groups);
    logger.debug(stakes);
  };

  const validate = (values: StakeFormValues) => {
    alert(values);
  };

  return (
    <div>
      <h2>Stake with a validator</h2>
      <Formik<StakeFormValues>
        initialValues={initialValues}
        onSubmit={onSubmit}
        validate={validate}
        validateOnChange={false}
        validateOnBlur={false}
      >
        <Form className="mt-2 flex w-full flex-col items-stretch">
          <div>
            <div className="flex justify-between pr-1">
              <label htmlFor="amount" className="pl-0.5 text-sm">
                Amount
              </label>
              <span className="text-xs">
                {`${formatNumberString(lockedBalance?.value, 2)} Locked CELO available`}
              </span>
            </div>
            <div className="relative">
              <NumberField name="amount" />
              <div className="absolute right-0 top-1/3 z-10">
                <OutlineButton onClick={() => alert('TODO')}>Max</OutlineButton>
              </div>
            </div>
          </div>
        </Form>
      </Formik>
    </div>
  );
}
