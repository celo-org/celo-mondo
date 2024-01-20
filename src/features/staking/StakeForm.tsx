import { Form, Formik, useField } from 'formik';
import { SyntheticEvent, useCallback, useEffect } from 'react';
import { IconButton } from 'src/components/buttons/IconButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { AmountField } from 'src/components/input/AmountField';
import { RadioField } from 'src/components/input/RadioField';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import { MIN_GROUP_SCORE_FOR_RANDOM, ZERO_ADDRESS } from 'src/config/consts';
import { useLockedBalance } from 'src/features/account/hooks';
import { StakeActionType, StakeActionValues } from 'src/features/staking/types';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { ValidatorGroupLogo } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanGroupName, getGroupStats } from 'src/features/validators/utils';

import ShuffleIcon from 'src/images/icons/shuffle.svg';
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

export function StakeForm({
  defaultGroup,
  defaultAction,
}: {
  defaultGroup?: Address;
  defaultAction?: StakeActionType;
}) {
  const { address } = useAccount();
  const { groups } = useValidatorGroups();
  const { lockedBalance } = useLockedBalance(address);
  const { stakeBalances } = useStakingBalances(address);

  const availableLockedWei = bigIntMax((lockedBalance || 0n) - (stakeBalances?.total || 0n), 0n);

  const onSubmit = (values: StakeFormValues) => {
    alert(values);
  };

  const validate = (values: StakeFormValues) => {
    logger.debug(defaultAction);
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
      <Form className="mt-4 flex flex-1 flex-col justify-between">
        <div className="space-y-4">
          <ActionTypeField />
          <StakeAmountField availableLockedWei={availableLockedWei} />
          <GroupField groups={groups} defaultGroup={defaultGroup} />
        </div>
        <SolidButton type="submit">Stake</SolidButton>
      </Form>
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

function StakeAmountField({ availableLockedWei }: { availableLockedWei: bigint }) {
  return <AmountField maxValueWei={availableLockedWei} maxDescription="CELO available" />;
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

  const currentGroup = groups?.find((g) => g.address === field.value);

  const onClickRandom = useCallback(
    (event: SyntheticEvent) => {
      event.preventDefault();
      if (!groups?.length) return;
      const goodGroups = groups.filter(
        (g) => getGroupStats(g).avgScore >= MIN_GROUP_SCORE_FOR_RANDOM,
      );
      const randomGroup = goodGroups[Math.floor(Math.random() * goodGroups.length)];
      helpers.setValue(randomGroup.address).catch((e) => logger.error(e));
    },
    [groups, helpers],
  );

  const onClickGroup = (address: Address) => {
    helpers.setValue(address).catch((e) => logger.error(e));
  };

  return (
    // Large bottom padding to make room for the group menu
    <div className="space-y-1 pb-36">
      <label htmlFor="group" className="pl-0.5 text-sm">
        Group
      </label>
      <DropdownMenu
        buttonClasses="w-full"
        button={
          <div className="btn btn-outline btn-secondary flex w-full cursor-pointer items-center justify-between px-3">
            <div className="flex items-center space-x-2">
              <ValidatorGroupLogo address={field.value} size={26} />
              <span className="text-black">{cleanGroupName(currentGroup?.name || 'None')}</span>
            </div>
            <div className="flex items-center space-x-4">
              <IconButton
                imgSrc={ShuffleIcon}
                width={14}
                height={10}
                title="Random"
                onClick={onClickRandom}
                className="px-1 py-1"
              />
              <ChevronIcon direction="s" width={14} height={14} className="pt-1" />
            </div>
          </div>
        }
        menuClasses="space-y-4 py-3 px-5 left-0 right-0 -top-[11rem] overflow-y-auto max-h-[24.75rem] all:w-auto"
        menuItems={(groups || []).map((g) => {
          return (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center space-x-2 hover:underline"
              key={g.address}
              onClick={() => onClickGroup(g.address)}
            >
              <ValidatorGroupLogo address={g.address} size={18} />
              <span>{cleanGroupName(g.name)}</span>
            </button>
          );
        })}
      />
    </div>
  );
}
