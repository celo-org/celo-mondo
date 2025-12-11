import clsx from 'clsx';
import Image from 'next/image';
import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { PLACEHOLDER_BAR_CHART_ITEM, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { sortAndCombineChartData } from 'src/components/charts/chartData';
import { HeaderAndSubheader } from 'src/components/layout/HeaderAndSubheader';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import { formatNumberString } from 'src/components/numbers/Amount';
import { useStCELOBalance } from 'src/features/account/hooks';
import { useStrategy } from 'src/features/staking/stCELO/hooks/useStCELO';
import { StCeloActionType } from 'src/features/staking/types';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { ValidatorGroupLogoAndName } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup } from 'src/features/validators/types';
import Ellipsis from 'src/images/icons/ellipsis.svg';
import { tableClasses } from 'src/styles/common';
import { fromWei } from 'src/utils/amount';
import { useAccount } from 'wagmi';

export function ActiveStrategyTable({
  addressToGroup,
  groupToIsActivatable,
}: {
  addressToGroup?: AddressTo<ValidatorGroup>;
  groupToIsActivatable?: AddressTo<boolean>;
}) {
  const account = useAccount();
  const { stCELOBalances } = useStCELOBalance(account.address);
  const { group, isLoading } = useStrategy(account.address);
  const showModal = useTransactionModal(TransactionFlowType.ChangeStrategy);

  const { chartData, tableData } = useMemo(() => {
    if (!group || !addressToGroup || stCELOBalances.total == 0n) {
      return { tableData: [], chartData: [PLACEHOLDER_BAR_CHART_ITEM] };
    }

    const tableData = [
      {
        stake: fromWei(stCELOBalances.total),
        percentage: 100,
        name: addressToGroup?.[group]?.name,
        address: group,
      },
    ];

    const chartData = sortAndCombineChartData(
      tableData.map(({ address, stake, percentage }) => ({
        label: addressToGroup[address]?.name || 'Unknown Group',
        value: stake,
        percentage,
      })),
    );
    return { chartData, tableData };
  }, [group, addressToGroup, stCELOBalances.total]);

  if (isLoading || !addressToGroup) {
    return <FullWidthSpinner>Loading staking data</FullWidthSpinner>;
  }

  if (!tableData.length) {
    return (
      <HeaderAndSubheader header="" subHeader={`No stCELO tokens`} className="my-10">
        <OutlineButton onClick={() => showModal()}>Liquid Stake for stCELO</OutlineButton>
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
          {tableData.map(({ address, name, stake, percentage }) => (
            <tr key={address}>
              <td className={tableClasses.td}>
                <div className="flex items-center space-x-5">
                  <ValidatorGroupLogoAndName address={address} name={name} />
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
                <OptionsDropdown
                  group={address}
                  isActivatable={groupToIsActivatable?.[address]}
                  changeStrategy={showModal}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OptionsDropdown({
  group,
}: {
  group: Address;
  isActivatable?: boolean;
  changeStrategy: () => void;
}) {
  const showTxModal = useTransactionModal();
  const onClickItem = (action: StCeloActionType) => {
    showTxModal(TransactionFlowType.ChangeStrategy, { group, action });
  };

  return (
    <DropdownMenu
      buttonClasses="inline-flex btn bg-neutral text-neutral min-h-0 h-6 border border-taupe-300 rounded-full items-center py-1"
      button={<Image src={Ellipsis} width={13} height={13} alt="Options" />}
      menuClasses="flex flex-col items-start space-y-3 p-3 right-0"
      menuItems={[
        <button
          className="underline-offset-2 hover:underline"
          key={1}
          onClick={() => onClickItem(StCeloActionType.ChangeStrategy)}
        >
          Change strategy
        </button>,
      ]}
    />
  );
}
