import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { Identicon } from 'src/components/icons/Identicon';
import { Collapse } from 'src/components/menus/Collapse';
import AddressLabel from 'src/components/text/AddressLabel';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { useProposalUpvoters } from 'src/features/governance/hooks/useProposalUpvoters';
import { objKeys } from 'src/utils/objects';

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

  const tableData = useMemo(() => {
    if (!upvoters) return [];
    return objKeys(upvoters);
  }, [upvoters]);

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
        {tableData.map((address) => (
          <tr key={address}>
            <td className="py-2">
              <Identicon address={address} size={20} />
            </td>
            <td className="px-4 py-2 text-sm">
              <AddressLabel address={address} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
