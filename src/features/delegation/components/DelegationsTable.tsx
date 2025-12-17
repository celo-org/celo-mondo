import Image from 'next/image';
import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { PLACEHOLDER_BAR_CHART_ITEM, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { sortAndCombineChartData } from 'src/components/charts/chartData';
import { HeaderAndSubheader } from 'src/components/layout/HeaderAndSubheader';
import { DropdownMenu } from 'src/components/menus/Dropdown';
import { formatNumberString } from 'src/components/numbers/Amount';
import { DelegateeLogoAndName } from 'src/features/delegation/components/DelegateeLogo';
import { DelegateActionType, Delegatee, DelegationAmount } from 'src/features/delegation/types';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import Ellipsis from 'src/images/icons/ellipsis.svg';
import { tableClasses } from 'src/styles/common';
import { fromWei } from 'src/utils/amount';
import { objKeys, objLength } from 'src/utils/objects';

export function DelegationsTable({
  delegateeToAmount,
  addressToDelegatee,
}: {
  delegateeToAmount?: AddressTo<DelegationAmount>;
  addressToDelegatee?: AddressTo<Delegatee>;
}) {
  const showTxModal = useTransactionModal(TransactionFlowType.Delegate);

  const { chartData, tableData } = useMemo(() => {
    if (!delegateeToAmount || !objLength(delegateeToAmount)) {
      return { tableData: [], chartData: [PLACEHOLDER_BAR_CHART_ITEM] };
    }

    const tableData = objKeys(delegateeToAmount)
      .map((address) => {
        const amount = fromWei(delegateeToAmount[address].amount);
        const percentage = delegateeToAmount[address].percent;
        const name = addressToDelegatee?.[address]?.name || 'Unknown Delegatee';
        return { address, name, amount, percentage };
      })
      .sort((a, b) => b.amount - a.amount);

    const chartData = sortAndCombineChartData(
      tableData.map(({ address, amount, percentage }) => ({
        label: addressToDelegatee?.[address]?.name || 'Unknown Delegatee',
        value: amount,
        percentage,
      })),
    );
    return { chartData, tableData };
  }, [delegateeToAmount, addressToDelegatee]);

  if (!delegateeToAmount) {
    return <FullWidthSpinner>Loading delegation data</FullWidthSpinner>;
  }

  if (!objLength(delegateeToAmount)) {
    return (
      <HeaderAndSubheader
        header="No funds delegated"
        subHeader={`You currently have no delegations. You can delegate voting power to contribute to Celo governance.`}
        className="my-10"
      >
        <SolidButton onClick={() => showTxModal()}>Delegate CELO</SolidButton>
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
            <th className={tableClasses.th}>%</th>
            <th className={tableClasses.th}></th>
          </tr>
        </thead>
        <tbody>
          {tableData.map(({ address, name, amount, percentage }) => (
            <tr key={address}>
              <td className={tableClasses.td}>
                <DelegateeLogoAndName address={address} name={name} />
              </td>
              <td className={tableClasses.td}>{formatNumberString(amount, 2) + ' CELO'}</td>
              <td className={tableClasses.td}>{percentage + '%'}</td>
              <td className={tableClasses.td}>
                <OptionsDropdown delegatee={address} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OptionsDropdown({ delegatee }: { delegatee: Address }) {
  const showTxModal = useTransactionModal();
  const onClickItem = (action: DelegateActionType) => {
    showTxModal(TransactionFlowType.Delegate, { delegatee, action });
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
          onClick={() => onClickItem(DelegateActionType.Delegate)}
        >
          Delegate more
        </button>,
        <button
          className="underline-offset-2 hover:underline"
          key={2}
          onClick={() => onClickItem(DelegateActionType.Undelegate)}
        >
          Undelegate
        </button>,
      ]}
    />
  );
}
