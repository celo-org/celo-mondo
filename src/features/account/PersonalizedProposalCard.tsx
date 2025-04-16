import clsx from 'clsx';
import Link from 'next/link';
import { formatNumberString } from 'src/components/numbers/Amount';
import { ProposalBadgeRow } from 'src/features/governance/components/ProposalCard';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { VoteAmounts, VoteType } from 'src/features/governance/types';
import { trimToLength } from 'src/utils/strings';

export function PersonalizedProposalCard({
  propData,
  isCompact,
  className,
  accountVotes,
}: {
  propData?: MergedProposalData;
  isCompact?: boolean;
  className?: string;
  accountVotes: VoteAmounts;
}) {
  if (!propData) {
    return null;
  }

  const { id, metadata } = propData;
  const { title, cgp } = metadata || {};

  const link = cgp ? `/governance/cgp-${cgp}` : `/governance/${id}`;
  const titleValue = title ? trimToLength(title, 50) : undefined;

  const [voteType, voteAmount] = Object.entries(accountVotes!).reduce(
    ([maxType, maxAmount], [currentType, currentAmount]) => {
      if (currentAmount > maxAmount) {
        return [currentType, currentAmount];
      }
      return [maxType, maxAmount];
    },
    [VoteType.None, 0n],
  );

  return (
    <Link href={link} className={clsx('space-y-2.5', className)}>
      <ProposalBadgeRow propData={propData} />
      {titleValue && <h2 className={clsx('font-medium', !isCompact && 'text-lg')}>{titleValue}</h2>}
      <span>
        You voted {voteType} with {formatNumberString(voteAmount, 2, true)} CELO
      </span>
    </Link>
  );
}
