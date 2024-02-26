import clsx from 'clsx';
import Image from 'next/image';
import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { PLACEHOLDER_BAR_CHART_ITEM, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { sortAndCombineChartData } from 'src/components/charts/chartData';
import { HeaderAndSubheader } from 'src/components/layout/HeaderAndSubheader';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import { formatNumberString } from 'src/components/numbers/Amount';
import { GroupToStake, StakeActionType } from 'src/features/staking/types';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { ValidatorGroupLogoAndName } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup } from 'src/features/validators/types';
import Ellipsis from 'src/images/icons/ellipsis.svg';
import { tableClasses } from 'src/styles/common';
import { fromWei } from 'src/utils/amount';
import { percent } from 'src/utils/math';
import { objKeys, objLength } from 'src/utils/objects';

export function ActiveStakesTable({
  groupToStake,
  addressToGroup,
  groupToIsActivatable,
  activateStake,
}: {
  groupToStake?: GroupToStake;
  addressToGroup?: AddressTo<ValidatorGroup>;
  groupToIsActivatable?: AddressTo<boolean>;
  activateStake: (g: Address) => void;
}) {
  const showStakeModal = useTransactionModal(TransactionFlowType.Stake);

  const { chartData, tableData } = useMemo(() => {
    if (!groupToStake || !addressToGroup || !objLength(groupToStake)) {
      return { tableData: [], chartData: [PLACEHOLDER_BAR_CHART_ITEM] };
    }

    const total = fromWei(
      Object.values(groupToStake).reduce(
        (total, { pending, active }) => total + active + pending,
        0n,
      ),
    );

    const tableData = objKeys(groupToStake)
      .map((address) => {
        const stake = fromWei(groupToStake[address].active + groupToStake[address].pending);
        const percentage = percent(stake, total);
        return { address, stake, percentage };
      })
      .sort((a, b) => b.stake - a.stake);

    const chartData = sortAndCombineChartData(
      tableData.map(({ address, stake, percentage }) => ({
        label: addressToGroup[address]?.name || 'Unknown',
        value: stake,
        percentage,
      })),
    );
    return { chartData, tableData };
  }, [groupToStake, addressToGroup]);

  if (!groupToStake || !addressToGroup || !groupToIsActivatable) {
    return <FullWidthSpinner>Loading staking data</FullWidthSpinner>;
  }

  if (!objLength(groupToStake)) {
    return (
      <HeaderAndSubheader
        header="No active stakes"
        subHeader={`You don’t currently have any funds staked. Stake with validators to start earning rewards.`}
        className="my-10"
      >
        <SolidButton onClick={() => showStakeModal()}>Stake CELO</SolidButton>
      </HeaderAndSubheader>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <StackedBarChart data={chartData} />
      <table className="w-full">
        <thead>
          <tr>
            <th className={tableClasses.th}>Name</th>
            <th className={tableClasses.th}>Amount</th>
            <th className={clsx(tableClasses.th, 'hidden sm:table-cell')}>%</th>
            <th className={tableClasses.th}></th>
          </tr>
        </thead>
        <tbody>
          {tableData.map(({ address, stake, percentage }) => (
            <tr key={address}>
              <td className={tableClasses.td}>
                <div className="flex items-center space-x-5">
                  <ValidatorGroupLogoAndName
                    address={address}
                    name={addressToGroup?.[address]?.name}
                  />
                  {groupToIsActivatable?.[address] && (
                    <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-400">
                      Pending
                    </span>
                  )}
                </div>
              </td>
              <td className={tableClasses.td}>{formatNumberString(stake, 2) + ' CELO'}</td>
              <td className={clsx(tableClasses.td, 'hidden sm:table-cell')}>{percentage + '%'}</td>
              <td className={tableClasses.td}>
                <StakeDropdown
                  group={address}
                  isActivatable={groupToIsActivatable?.[address]}
                  activateStake={activateStake}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StakeDropdown({
  group,
  isActivatable,
  activateStake,
}: {
  group: Address;
  isActivatable?: boolean;
  activateStake: (g: Address) => void;
}) {
  const showTxModal = useTransactionModal();
  const onClickItem = (action: StakeActionType) => {
    showTxModal(TransactionFlowType.Stake, { group, action });
  };

  return (
    <DropdownMenu
      buttonClasses="inline-flex btn btn-neutral min-h-0 h-6 border border-taupe-300 rounded-full items-center py-1"
      button={<Image src={Ellipsis} width={13} height={13} alt="Options" />}
      menuClasses="flex flex-col items-start space-y-3 p-3 right-0"
      menuItems={[
        ...(isActivatable
          ? [
              <button
                className="underline-offset-2 hover:underline"
                key={0}
                onClick={() => activateStake(group)}
              >
                Activate
              </button>,
            ]
          : []),
        <button
          className="underline-offset-2 hover:underline"
          key={1}
          onClick={() => onClickItem(StakeActionType.Stake)}
        >
          Stake more
        </button>,
        <button
          className="underline-offset-2 hover:underline"
          key={2}
          onClick={() => onClickItem(StakeActionType.Unstake)}
        >
          Unstake
        </button>,
        <button
          className="underline-offset-2 hover:underline"
          key={3}
          onClick={() => onClickItem(StakeActionType.Transfer)}
        >
          Transfer
        </button>,
      ]}
    />
  );
}
