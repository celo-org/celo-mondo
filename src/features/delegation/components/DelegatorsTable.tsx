import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { sortAndCombineChartData } from 'src/components/charts/chartData';
import { Collapse } from 'src/components/menus/Collapse';
import { formatNumberString } from 'src/components/numbers/Amount';
import { CopyInline } from 'src/components/text/CopyInline';
import { useDelegators } from 'src/features/delegation/hooks/useDelegators';
import { Delegatee } from 'src/features/delegation/types';
import { normalizeAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { objKeys } from 'src/utils/objects';
import { useAddressToLabel } from 'src/utils/useAddressToLabel';

const NUM_TO_SHOW = 20;

const name = (delegatee: Delegatee) => (delegatee.stCELO ? 'Stakers' : 'Delegators');
export function DelegatorsTable({ delegatee }: { delegatee: Delegatee }) {
  return (
    <Collapse
      button={<h2 className="text-left font-serif text-2xl">{name(delegatee)}</h2>}
      buttonClasses="w-full"
    >
      <DelegatorsTableContent delegatee={delegatee} />
    </Collapse>
  );
}

function DelegatorsTableContent({ delegatee }: { delegatee: Delegatee }) {
  const { delegatorToAmount, isLoading } = useDelegators(delegatee);
  const addressToLabel = useAddressToLabel();

  const tableData = useMemo(() => {
    if (!delegatorToAmount) return [];
    const data = objKeys(delegatorToAmount).map((address) => ({
      label: addressToLabel(address),
      value: fromWei(delegatorToAmount[address]),
      address: normalizeAddress(address),
    }));
    return sortAndCombineChartData(data, NUM_TO_SHOW);
  }, [delegatorToAmount, addressToLabel]);

  if (isLoading) {
    return (
      <SpinnerWithLabel size="md" className="py-6">
        Loading {name(delegatee)}
      </SpinnerWithLabel>
    );
  }

  if (!tableData.length) {
    return <div className="py-6 text-center text-sm text-gray-600">No {name(delegatee)} found</div>;
  }

  return (
    <table className="w-full">
      <tbody>
        {tableData.map((row) => (
          <tr key={row.label}>
            <td className="py-2 font-mono text-sm text-taupe-600">
              <CopyInline text={row.label} textToCopy={row.address!} />
            </td>
            <td className="text-right text-sm">{`${formatNumberString(row.value)} ${delegatee.stCELO ? 'st' : ''}CELO`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
