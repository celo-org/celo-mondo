'use client';

import Link from 'next/link';
import { SkeletonBlock } from 'src/components/animation/Skeleton';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { Section } from 'src/components/layout/Section';
import { CeloGlyph } from 'src/components/logos/Celo';
import { H1 } from 'src/components/text/headers';
import { Methodology } from 'src/features/buyback/components/Methodology';
import { PeriodFigures } from 'src/features/buyback/components/PeriodFigures';
import { SettledCard } from 'src/features/buyback/components/SettledCard';
import { TotalsSkeleton, TotalsTable } from 'src/features/buyback/components/TotalsTable';
import { useBuybackStats } from 'src/features/buyback/useBuybackStats';

export function BuybackDashboard() {
  const { stats, view, refreshFailed, isStale } = useBuybackStats();

  return (
    <Section className="mt-6" containerClassName="space-y-6 max-w-screen-md">
      <div className="flex items-center space-x-3">
        <CeloGlyph width={34} height={34} />
        <H1>CELO Buyback</H1>
      </div>

      <p className="max-w-xl text-sm text-taupe-600">
        Under{' '}
        <A_Blank
          href="https://forum.celo.org/t/celoccelerate-celo-tokenomics-proposal/13147"
          className="underline"
        >
          CELOccelerate (CGP-233)
        </A_Blank>
        , Celo L2 sequencer revenue, after the core protocol operating costs the proposal names (OP
        Stack, EigenDA, Succinct and, while applicable, carbon offsets), is used to acquire CELO for
        the Community Fund, where CELO holders govern its use (which may include burning). Figures
        are estimates computed from gross daily fee P&amp;L, the same data as the operator
        distribution report, not settled amounts; actual transfers to the Community Fund are
        executed in periodic batches. Totals leave out earlier revenue, which was already returned
        to the Community Fund in a single transfer of 1,748,950 CELO (see{' '}
        <Link href="/governance/cgp-234" className="underline">
          CGP-234
        </Link>
        ).
      </p>

      {view === 'stats' && stats ? (
        <>
          <TotalsTable
            totals={stats.totals}
            latestDay={stats.latestDayStats}
            sinceDay={stats.sinceDay}
          />
          <SettledCard
            settled={stats.settled ?? null}
            estimatedCelo={stats.totals.celoToCommunityFund}
          />
          <PeriodFigures days={stats.days ?? []} />
        </>
      ) : view === 'error' ? (
        <UnavailableNotice />
      ) : (
        <>
          <TotalsSkeleton />
          <ChartsSkeleton />
        </>
      )}

      <Methodology />
      <Footnote
        sinceDay={stats?.sinceDay}
        latestDay={stats?.latestDay}
        updatedAt={stats?.updatedAt}
        refreshFailed={refreshFailed}
        isStale={isStale}
      />
    </Section>
  );
}

function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-taupe-300 bg-white p-4">
          <SkeletonBlock className="mb-3 h-4 w-56" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      ))}
    </div>
  );
}

function UnavailableNotice() {
  return (
    <div className="border border-taupe-300 bg-white p-6 text-center text-sm text-taupe-600">
      Buyback stats are not available yet. They are refreshed once a day at 05:30 UTC; please try
      again later.
    </div>
  );
}

function Footnote({
  sinceDay,
  latestDay,
  updatedAt,
  refreshFailed,
  isStale,
}: {
  sinceDay?: string;
  latestDay?: string | null;
  updatedAt?: string | null;
  refreshFailed?: boolean;
  isStale?: boolean;
}) {
  const parts: string[] = [];
  if (sinceDay && latestDay) parts.push(`Data ${sinceDay} to ${latestDay} (UTC days)`);
  const refreshed = updatedAt ? new Date(updatedAt) : null;
  if (refreshed && !Number.isNaN(refreshed.getTime())) {
    parts.push(`Dune refreshed ${refreshed.toUTCString()}`);
  }
  if (refreshFailed) parts.push('latest update failed, showing the last loaded figures');
  if (isStale) parts.push('data may be out of date');

  return (
    <p className="text-center text-xs text-taupe-600">
      Source:{' '}
      <A_Blank href="https://dune.com/queries/6898547" className="underline">
        Dune query 6898547
      </A_Blank>
      {parts.length > 0 ? ` · ${parts.join(' · ')}` : ''}
    </p>
  );
}
