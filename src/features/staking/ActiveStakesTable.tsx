import clsx from 'clsx';
import Image from 'next/image';
import { useMemo } from 'react';
import { PLACEHOLDER_BAR_CHART_ITEM, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { sortAndCombineChartData } from 'src/components/charts/chartData';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import { formatNumberString } from 'src/components/numbers/Amount';
import { GroupToStake, StakeActionType } from 'src/features/staking/types';
import { useStore } from 'src/features/store';
import { TxModalType } from 'src/features/transactions/types';
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
}: {
  groupToStake?: GroupToStake;
  addressToGroup?: Record<Address, ValidatorGroup>;
}) {
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
                <ValidatorGroupLogoAndName
                  address={address}
                  name={addressToGroup?.[address]?.name}
                  className="md:pr-10"
                />
              </td>
              <td className={tableClasses.td}>{formatNumberString(stake, 2) + ' CELO'}</td>
              <td className={clsx(tableClasses.td, 'hidden sm:table-cell')}>{percentage + '%'}</td>
              <td className={tableClasses.td}>
                <StakeDropdown address={address} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// TODO activation button or dropdown item
function StakeDropdown({ address }: { address: Address }) {
  const setTxModal = useStore((state) => state.setTransactionModal);
  const onClickItem = (action: StakeActionType) => {
    setTxModal({
      type: TxModalType.Stake,
      props: { defaultGroup: address, defaultAction: action },
    });
  };

  return (
    <DropdownMenu
      buttonClasses="inline-flex btn btn-neutral min-h-0 h-6 border border-taupe-300 rounded-full items-center py-1"
      button={<Image src={Ellipsis} width={13} height={13} alt="Options" />}
      menuClasses="flex flex-col items-start space-y-3 p-3 right-0"
      menuItems={[
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
