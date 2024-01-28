'use client';
import { useMemo } from 'react';
import { Fade } from 'src/components/animation/Fade';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Section } from 'src/components/layout/Section';
import { StatBox } from 'src/components/layout/StatBox';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { TxModalType } from 'src/features/transactions/types';
import { ValidatorGroupTable } from 'src/features/validators/ValidatorGroupTable';
import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { bigIntMin } from 'src/utils/math';
import { objLength } from 'src/utils/objects';

export default function Index() {
  const { groups, totalVotes } = useValidatorGroups();

  return (
    <>
      <Section className="mt-4">
        <div className="space-y-6">
          <HeroSection totalVotes={totalVotes} groups={groups} />
          <TableSection totalVotes={totalVotes} groups={groups} />
        </div>
      </Section>
    </>
  );
}

function HeroSection({ totalVotes, groups }: { totalVotes?: bigint; groups?: ValidatorGroup[] }) {
  const { minVotes, numValidators } = useMemo(() => {
    if (!groups?.length) return { minVotes: 0n, numValidators: 0 };
    let minVotes = BigInt(1e40);
    let numValidators = 0;
    for (const g of groups) {
      numValidators += objLength(g.members);
      const numElectedMembers = Object.values(g.members).filter(
        (m) => m.status === ValidatorStatus.Elected,
      ).length;
      if (!numElectedMembers) continue;
      const votesPerMember = g.votes / BigInt(numElectedMembers);
      minVotes = bigIntMin(minVotes, votesPerMember);
    }
    return { minVotes, numValidators };
  }, [groups]);

  const showStakeModal = useTransactionModal(TxModalType.Stake);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl sm:text-4xl">Discover Validators</h1>
        <SolidButton onClick={() => showStakeModal()} className="px-8">
          Stake
        </SolidButton>
      </div>
      <div className="flex items-center justify-between gap-2 sm:gap-8">
        <StatBox
          header="Total Staked CELO"
          valueWei={totalVotes}
          className="max-w-xs md:max-w-sm"
        />
        <StatBox
          header="Elected Minimum Votes"
          valueWei={minVotes}
          className="max-w-xs md:max-w-sm"
        />
        <StatBox className="hidden max-w-xs md:max-w-sm lg:flex" valueWei={null}>
          <div className="flex gap-6 divide-x">
            <div className="flex flex-col">
              <h3 className="text-nowrap text-sm">Total Groups</h3>
              <div className="mt-2 font-serif text-xl md:text-2xl">{groups?.length || 0}</div>
            </div>
            <div className="flex flex-col pl-6">
              <h3 className="text-nowrap text-sm">Total Validators</h3>
              <div className="mt-2 font-serif text-xl md:text-2xl">{numValidators}</div>
            </div>
          </div>
        </StatBox>
      </div>
    </div>
  );
}

function TableSection({ totalVotes, groups }: { totalVotes?: bigint; groups?: ValidatorGroup[] }) {
  if (!totalVotes || !groups) {
    return (
      <div className="flex justify-center py-10">
        <SpinnerWithLabel>Loading validator data</SpinnerWithLabel>
      </div>
    );
  }

  return (
    <Fade show={!!(totalVotes && groups)}>
      <ValidatorGroupTable groups={groups || []} totalVotes={totalVotes || 0n} />
    </Fade>
  );
}
