import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { sortAndCombineChartData } from 'src/components/charts/chartData';
import { Collapse } from 'src/components/menus/Collapse';
import { formatNumberString } from 'src/components/numbers/Amount';
import { useDelegators } from 'src/features/delegation/hooks/useDelegators';
import { Delegatee } from 'src/features/delegation/types';
import { shortenAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { objKeys } from 'src/utils/objects';

const NUM_TO_SHOW = 20;

export function DelegatorsTable({ delegatee }: { delegatee: Delegatee }) {
  return (
    <Collapse
      button={<h2 className="text-left font-serif text-2xl">Delegators</h2>}
      buttonClasses="w-full"
    >
      <DelegatorsTableContent delegatee={delegatee} />
    </Collapse>
  );
}

function DelegatorsTableContent({ delegatee }: { delegatee: Delegatee }) {
  const { delegatorToAmount, isLoading } = useDelegators(delegatee.address);

  const tableData = useMemo(() => {
    if (!delegatorToAmount) return [];
    const data = objKeys(delegatorToAmount).map((address) => ({
      label: shortenAddress(address),
      value: fromWei(delegatorToAmount[address]),
    }));
    return sortAndCombineChartData(data, NUM_TO_SHOW);
  }, [delegatorToAmount]);

  if (isLoading) {
    return (
      <SpinnerWithLabel size="md" className="py-6">
        Loading delegators
      </SpinnerWithLabel>
    );
  }

  if (!tableData.length) {
    return <div className="py-6 text-center text-sm text-gray-600">No delegators found</div>;
  }

  return (
    <table>
      <tbody>
        {tableData.map((row) => (
          <tr key={row.label}>
            <td className="py-2 text-sm">{row.label}</td>
            <td className="text-sm">{`${formatNumberString(row.value)} CELO`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
