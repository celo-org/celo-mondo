import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { PLACEHOLDER_BAR_CHART_ITEM, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { sortAndCombineChartData } from 'src/components/charts/chartData';
import { HeaderAndSubheader } from 'src/components/layout/HeaderAndSubheader';
import { formatNumberString } from 'src/components/numbers/Amount';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { ValidatorGroupLogoAndName } from 'src/features/validators/ValidatorGroupLogo';
import { ValidatorGroup } from 'src/features/validators/types';
import { tableClasses } from 'src/styles/common';
import { percent, sum } from 'src/utils/math';
import { objKeys, objLength } from 'src/utils/objects';
import { useAddressToLabel } from 'src/utils/useAddressToLabel';

export function RewardsTable({
  groupToReward,
  addressToGroup,
}: {
  groupToReward?: AddressTo<number>;
  addressToGroup?: AddressTo<ValidatorGroup>;
}) {
  const showStakeModal = useTransactionModal(TransactionFlowType.Stake);
  const addressToLabel = useAddressToLabel(() => 'Unknown Group');

  const { chartData, tableData } = useMemo(() => {
    if (!groupToReward || !addressToGroup || !objLength(groupToReward)) {
      return { tableData: [], chartData: [PLACEHOLDER_BAR_CHART_ITEM] };
    }

    const total = sum(Object.values(groupToReward));

    const tableData = objKeys(groupToReward)
      .map((address) => {
        const reward = groupToReward[address];
        const percentage = total ? percent(reward, total) : 0;
        const { label, fallback } = addressToLabel(address);
        return { address, name: label || fallback, reward, percentage };
      })
      .sort((a, b) => b.reward - a.reward);

    const chartData = sortAndCombineChartData(
      tableData.map(({ reward, percentage, name }) => ({
        label: name,
        value: reward,
        percentage,
      })),
    );
    return { chartData, tableData };
  }, [groupToReward, addressToGroup, addressToLabel]);

  if (!groupToReward || !addressToGroup) {
    return <FullWidthSpinner>Loading staking data</FullWidthSpinner>;
  }

  if (!objLength(groupToReward)) {
    return (
      <HeaderAndSubheader
        header="No staking rewards"
        subHeader={`You don’t currently have any rewards. Stake with validators to start earning rewards.`}
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
            <th className={tableClasses.th}>%</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map(({ address, name, reward, percentage }) => (
            <tr key={address}>
              <td className={tableClasses.td}>
                <ValidatorGroupLogoAndName address={address} name={name} />
              </td>
              <td className={tableClasses.td}>{formatNumberString(reward, 2) + ' CELO'}</td>
              <td className={tableClasses.td}>{percentage + '%'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
