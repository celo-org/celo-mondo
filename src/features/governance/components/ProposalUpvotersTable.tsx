import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { Identicon } from 'src/components/icons/Identicon';
import { Collapse } from 'src/components/menus/Collapse';
import { useProposalUpvoters } from 'src/features/governance/hooks/useProposalUpvoters';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanGroupName } from 'src/features/validators/utils';
import { shortenAddress } from 'src/utils/addresses';
import { objKeys } from 'src/utils/objects';
import { MergedProposalData } from '../governanceData';

export function ProposalUpvotersTable({ propData }: { propData: MergedProposalData }) {
  return (
    <div className="hidden md:block">
      <Collapse
        button={<h2 className="text-left font-serif text-2xl">Upvoters</h2>}
        buttonClasses="w-full"
        defaultOpen={true}
      >
        <UpvoterTableContent propData={propData} />
      </Collapse>
    </div>
  );
}

function UpvoterTableContent({ propData }: { propData: MergedProposalData }) {
  const { isLoading, upvoters } = useProposalUpvoters(propData.id);
  const { addressToGroup } = useValidatorGroups();

  const tableData = useMemo(() => {
    if (!upvoters) return [];
    return objKeys(upvoters).map((address) => {
      const groupName = cleanGroupName(addressToGroup?.[address]?.name || '');
      const label = groupName || shortenAddress(address);
      return { label, address };
    });
  }, [upvoters, addressToGroup]);

  if (isLoading) {
    return (
      <SpinnerWithLabel size="md" className="py-6">
        Loading upvoters
      </SpinnerWithLabel>
    );
  }

  if (!tableData.length) {
    return <div className="py-6 text-center text-sm text-gray-600">No upvoters found</div>;
  }

  return (
    <table>
      <tbody>
        {tableData.map((row) => (
          <tr key={row.address}>
            <td className="py-2">
              <Identicon address={row.address} size={20} />
            </td>
            <td className="px-4 py-2 text-sm">{row.label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
