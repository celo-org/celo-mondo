import { Fragment, useMemo, useState } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { ChartDataItem } from 'src/components/charts/chartData';
import { Collapse } from 'src/components/menus/Collapse';
import { formatNumberString } from 'src/components/numbers/Amount';
import AddressLabel from 'src/components/text/AddressLabel';
import { CopyInline } from 'src/components/text/CopyInline';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { useProposalVoters } from 'src/features/governance/hooks/useProposalVoters';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { useIsMobile } from 'src/styles/mediaQueries';
import { normalizeAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { bigIntMax, percent } from 'src/utils/math';
import { objKeys } from 'src/utils/objects';
import { toTitleCase } from 'src/utils/strings';

const NUM_TO_SHOW = 20;

export function ProposalVotersTable({ propData }: { propData: MergedProposalData }) {
  const isMobile = useIsMobile();
  const votersData = useProposalVoters(propData.id);
  return (
    <Collapse
      button={
        <h2 className="text-left font-serif text-2xl">
          Voters <VotersCount {...votersData} />
        </h2>
      }
      buttonClasses="w-full"
      defaultOpen={isMobile ? false : propData.stage >= ProposalStage.Execution}
    >
      <VoterTableContent key={propData.id} propData={{ ...propData, votersData }} />
    </Collapse>
  );
}

function VoterTableContent({
  propData,
}: {
  propData: MergedProposalData & { votersData: ReturnType<typeof useProposalVoters> };
}) {
  const { isLoading, voters, totals } = propData.votersData;

  const [showAll, setShowAll] = useState(false);

  const tableData = useMemo(() => {
    if (!voters || !totals) return [];
    // Accounts can split their vote, so each vote type gets its own row
    const rows: Array<ChartDataItem & { type: VoteType }> = [];
    for (const account of objKeys(voters)) {
      for (const type of objKeys(voters[account])) {
        const amount = fromWei(voters[account][type]);
        if (amount <= 0) continue;
        const percentage = percent(voters[account][type], bigIntMax(totals[type], 1n));
        rows.push({
          label: account,
          value: amount,
          percentage,
          address: normalizeAddress(account),
          type,
        });
      }
    }
    return rows.sort((a, b) => b.value - a.value);
  }, [voters, totals]);

  const visibleRows = showAll ? tableData : tableData.slice(0, NUM_TO_SHOW);

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
    <>
      <div className="grid grid-cols-6 gap-x-2 gap-y-4 pt-4">
        {visibleRows.map((row) => (
          <Fragment key={`${row.address}-${row.type}`}>
            <div className="col-span-3 font-mono text-sm text-taupe-600">
              <CopyInline
                text={
                  <AddressLabel
                    address={row.address!}
                    className="text-ellipsis text-nowrap text-start"
                  />
                }
                textToCopy={row.address!}
              />
            </div>
            <div className="text-sm font-medium">{toTitleCase(row.type)}</div>
            <div className="col-span-2">
              <div className="flex w-fit items-center space-x-2 rounded-full bg-taupe-300 px-2">
                <span className="text-sm">{`${row.percentage?.toFixed(1) || 0}%`}</span>
                <span className="text-[0.6rem] text-gray-500">{`(${formatNumberString(row.value)})`}</span>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
      {tableData.length > NUM_TO_SHOW && (
        <button
          type="button"
          className="mt-4 text-sm text-taupe-600 underline-offset-2 hover:underline"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? 'Show fewer' : `Show all ${tableData.length} votes`}
        </button>
      )}
    </>
  );
}

function VotersCount({ isLoading, voters }: ReturnType<typeof useProposalVoters>) {
  if (isLoading) return null;

  return <span className="pl-4 text-sm text-taupe-600">{Object.keys(voters!).length}</span>;
}
