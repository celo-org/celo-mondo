'use client';
import { useMemo } from 'react';
import { Fade } from 'src/components/animation/Fade';
import { SkeletonBlock } from 'src/components/animation/Skeleton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Section } from 'src/components/layout/Section';
import { StatBox } from 'src/components/layout/StatBox';
import { H1 } from 'src/components/text/headers';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { ValidatorGroupTable } from 'src/features/validators/ValidatorGroupTable';
import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import { bigIntMin } from 'src/utils/math';
import { objLength } from 'src/utils/objects';
import { useIsMiniPay } from 'src/utils/useIsMiniPay';
import { useStakingMode } from 'src/utils/useStakingMode';

export default function Page() {
  const { groups, totalVotes } = useValidatorGroups();

  return (
    <Section className="mt-4">
      <div className="space-y-6">
        <HeroSection totalVotes={totalVotes} groups={groups} />
        <TableSection totalVotes={totalVotes} groups={groups} />
      </div>
    </Section>
  );
}

function HeroSection({ totalVotes, groups }: { totalVotes?: bigint; groups?: ValidatorGroup[] }) {
  const { minVotes, numValidators } = useMemo(() => {
    if (!groups?.length) return { minVotes: 0n, numValidators: 0 };
    let minVotes = BigInt(1e40);
    let numValidators = 0;
    for (const g of groups) {
      if (!g.eligible) continue;
      numValidators += objLength(g.members);
      const numElectedMembers = Object.values(g.members).filter(
        (m) => m.status === ValidatorStatus.Elected,
      ).length;
      if (!numElectedMembers || g.votes === 0n) continue;
      const votesPerMember = g.votes / BigInt(numElectedMembers);

      minVotes = bigIntMin(minVotes, votesPerMember);
    }
    return { minVotes, numValidators };
  }, [groups]);

  const showStakeModal = useTransactionModal(TransactionFlowType.Stake);
  const showLiquidStakeModal = useTransactionModal(TransactionFlowType.StakeStCELO);
  const { selectMode } = useStakingMode();
  const isMiniPay = useIsMiniPay();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <H1>Discover Validators</H1>
        <div className="flex flex-row gap-2">
          <SolidButton
            className="bg-yellow-500 px-4 sm:px-8"
            onClick={() => {
              selectMode('CELO');
              showStakeModal();
            }}
          >
            Stake
          </SolidButton>
          {!isMiniPay && (
            <SolidButton
              onClick={() => {
                selectMode('stCELO');
                showLiquidStakeModal();
              }}
              className="bg-purple-300 px-4 text-white sm:px-8"
            >
              Liquid Stake
            </SolidButton>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 sm:gap-8">
        {!totalVotes || !groups ? (
          <>
            <StatBox header="Total Staked CELO" valueWei={null} className="max-w-xs md:max-w-sm">
              <SkeletonBlock className="h-7 w-32 md:h-8" />
            </StatBox>
            <StatBox
              header="Elected Minimum Votes"
              valueWei={null}
              className="max-w-xs md:max-w-sm"
            >
              <SkeletonBlock className="h-7 w-32 md:h-8" />
            </StatBox>
            <StatBox className="hidden max-w-xs md:max-w-sm lg:flex" valueWei={null}>
              <div className="flex gap-6 divide-x">
                <div className="flex flex-col">
                  <h3 className="text-nowrap text-sm">Total Groups</h3>
                  <SkeletonBlock className="mt-2 h-7 w-12 md:h-8" />
                </div>
                <div className="flex flex-col pl-6">
                  <h3 className="text-nowrap text-sm">Total Validators</h3>
                  <SkeletonBlock className="mt-2 h-7 w-12 md:h-8" />
                </div>
              </div>
            </StatBox>
          </>
        ) : (
          <>
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
                  <div className="mt-2 font-serif text-xl md:text-2xl">{groups.length}</div>
                </div>
                <div className="flex flex-col pl-6">
                  <h3 className="text-nowrap text-sm">Total Validators</h3>
                  <div className="mt-2 font-serif text-xl md:text-2xl">{numValidators}</div>
                </div>
              </div>
            </StatBox>
          </>
        )}
      </div>
    </div>
  );
}

function TableSection({ totalVotes, groups }: { totalVotes?: bigint; groups?: ValidatorGroup[] }) {
  if (!totalVotes || !groups) {
    return <ValidatorTableSkeleton />;
  }

  return (
    <Fade show={!!(totalVotes && groups)}>
      <ValidatorGroupTable groups={groups || []} totalVotes={totalVotes || 0n} />
    </Fade>
  );
}

function ValidatorTableSkeleton() {
  return (
    <div>
      <div className="flex flex-col items-stretch gap-4 px-4 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-flow-row grid-cols-2 gap-x-7 gap-y-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-6 w-24" />
          ))}
        </div>
        <SkeletonBlock className="h-10 w-full rounded-full md:w-64" />
      </div>
      <table className="lg:min-w-248 xl:min-w-300 mt-2 w-full">
        <thead>
          <tr>
            {['w-6', 'w-24', 'w-16', 'w-12', 'w-14', 'w-14', 'w-16'].map((w, i) => (
              <th
                key={i}
                className={`border-y border-taupe-300 px-4 py-3 ${i >= 2 ? 'hidden md:table-cell' : ''}`}
              >
                <SkeletonBlock className={`h-4 ${w}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }).map((_, row) => (
            <tr key={row}>
              {['w-6', 'w-32', 'w-20', 'w-12', 'w-14', 'w-16', 'w-16'].map((w, col) => (
                <td
                  key={col}
                  className={`border-y border-taupe-300 px-4 py-4 ${col >= 2 ? 'hidden md:table-cell' : ''}`}
                >
                  <SkeletonBlock className={`h-5 ${w}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
