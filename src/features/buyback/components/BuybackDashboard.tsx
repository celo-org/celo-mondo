'use client';

import Link from 'next/link';
import { SkeletonBlock } from 'src/components/animation/Skeleton';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { Section } from 'src/components/layout/Section';
import { CeloGlyph } from 'src/components/logos/Celo';
import { H1 } from 'src/components/text/headers';
import { AllTimeTable } from 'src/features/buyback/components/AllTimeTable';
import { Methodology } from 'src/features/buyback/components/Methodology';
import { PeriodFigures } from 'src/features/buyback/components/PeriodFigures';
import { SettledCard } from 'src/features/buyback/components/SettledCard';
import { TotalsSkeleton, TotalsTable, fmtCelo } from 'src/features/buyback/components/TotalsTable';
import {
  CGP_234_RETURN,
  SETTLED_REVENUE_CUTOFF_DATE,
  nextUtcDay,
} from 'src/features/buyback/computeStats';
import { useBuybackStats } from 'src/features/buyback/useBuybackStats';

// The window start is fixed by the cutoff, so the intro can name it before
// the figures have loaded.
const sinceDay = nextUtcDay(SETTLED_REVENUE_CUTOFF_DATE);

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
        executed in periodic batches. The totals and charts start on {sinceDay}: Celo Core Co.
        returned {fmtCelo(CGP_234_RETURN.celo).text} to the Community Fund on {CGP_234_RETURN.day}{' '}
        (see{' '}
        <Link href="/governance/cgp-234" className="underline">
          CGP-234
        </Link>
        ) and its accounting counts revenue from the L2 launch through {SETTLED_REVENUE_CUTOFF_DATE}{' '}
        as settled by that return. That first period is shown in the all-time table below.
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
          {/* A row stored before the first period was computed is served
              until the next daily refresh replaces it; the table waits a day. */}
          {stats.initial && (
            <AllTimeTable
              initial={stats.initial}
              totals={stats.totals}
              sinceDay={stats.sinceDay}
              settled={stats.settled ?? null}
            />
          )}
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
        sinceDay={stats?.initial?.sinceDay ?? stats?.sinceDay}
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
