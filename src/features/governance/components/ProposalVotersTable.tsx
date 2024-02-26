import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { ChartDataItem, sortAndCombineChartData } from 'src/components/charts/chartData';
import { Collapse } from 'src/components/menus/Collapse';
import { formatNumberString } from 'src/components/numbers/Amount';
import { MergedProposalData } from 'src/features/governance/hooks/useGovernanceProposals';
import { useProposalVoters } from 'src/features/governance/hooks/useProposalVoters';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { cleanGroupName } from 'src/features/validators/utils';
import { shortenAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { percent } from 'src/utils/math';
import { objKeys, objMap } from 'src/utils/objects';
import { toTitleCase } from 'src/utils/strings';

const NUM_VOTERS_TO_SHOW = 20;

export function ProposalVotersTable({ propData }: { propData: MergedProposalData }) {
  return (
    <Collapse
      button={<h2 className="text-left font-serif text-2xl">Voters</h2>}
      buttonClasses="w-full"
      defaultOpen={propData.stage >= ProposalStage.Execution}
    >
      <VoterTableContent propData={propData} />
    </Collapse>
  );
}

function VoterTableContent({ propData }: { propData: MergedProposalData }) {
  const { isLoading, voters, totals } = useProposalVoters(propData.id);
  const { addressToGroup } = useValidatorGroups();

  const tableData = useMemo(() => {
    if (!voters || !totals) return [];
    // Accounts can split their vote which complicates the table data
    // Creating separate entries for each vote type for each account
    const votesByType: Record<VoteType, Array<ChartDataItem>> = {
      [VoteType.None]: [],
      [VoteType.Yes]: [],
      [VoteType.No]: [],
      [VoteType.Abstain]: [],
    };
    for (const account of objKeys(voters)) {
      const groupName = cleanGroupName(addressToGroup?.[account]?.name || '');
      const label = groupName || shortenAddress(account);
      for (const type of objKeys(voters[account])) {
        const amount = fromWei(voters[account][type]);
        const percentage = percent(voters[account][type], totals[type]);
        votesByType[type]?.push({ label, value: amount, percentage });
      }
    }
    // Use the sortAndCombine utility to collapse down to limited number
    const combinedByType = objMap(votesByType, (type) =>
      sortAndCombineChartData(votesByType[type], NUM_VOTERS_TO_SHOW),
    );
    // Weave in type and flatten
    const combined = objKeys(combinedByType)
      .map((type) => combinedByType[type].map((v) => ({ ...v, type })))
      .flat();
    // Sort by value and take the top NUM_VOTERS_TO_SHOW
    const sorted = combined.sort((a, b) => b.value - a.value);
    return sorted.slice(0, NUM_VOTERS_TO_SHOW);
  }, [voters, totals, addressToGroup]);

  if (isLoading) {
    return (
      <SpinnerWithLabel size="md" className="py-6">
        Loading voters
      </SpinnerWithLabel>
    );
  }

  if (!tableData.length) {
    return <div className="py-6 text-center text-sm text-gray-600">No voters found</div>;
  }

  return (
    <table>
      <tbody>
        {tableData.map((row) => (
          <tr key={row.label}>
            <td className="py-2 text-sm">{row.label}</td>
            <td className="px-4 py-2 text-sm font-medium">{toTitleCase(row.type)}</td>
            <td>
              <div className="flex w-fit items-center space-x-2 rounded-full bg-taupe-300 px-2">
                <span className="text-sm">{`${row.percentage?.toFixed(1) || 0}%`}</span>
                <span className="text-xs text-gray-500">{`(${formatNumberString(
                  row.value,
                )})`}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
