'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { SkeletonBlock } from 'src/components/animation/Skeleton';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { Section } from 'src/components/layout/Section';
import { CeloGlyph } from 'src/components/logos/Celo';
import { H1 } from 'src/components/text/headers';
import { PeriodStats } from 'src/features/buyback/types';
import { isBuybackDataStale, useBuybackStats } from 'src/features/buyback/useBuybackStats';

const usd0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const price3 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

// A rendered stat cell. Values can legitimately go negative (a day where L1
// costs exceed revenue is a loss), so the sign travels with the text and the
// table colors losses red instead of green.
interface Cell {
  text: string;
  negative: boolean;
}

function cell(text: string, value?: number): Cell {
  return { text, negative: value != null && value < 0 };
}

// Round before deriving the sign so a value like -0.4 renders as "0", not "-0" in red.
function fmtWhole(value: number | undefined, unit: string): Cell {
  if (value == null) return cell('—');
  const rounded = Math.round(value) || 0;
  return cell(`${usd0.format(rounded)} ${unit}`, rounded);
}

function fmtUsd(value?: number): Cell {
  return fmtWhole(value, 'USD');
}

function fmtCelo(value?: number): Cell {
  return fmtWhole(value, 'CELO');
}

function fmtPrice(value?: number): Cell {
  return cell(value == null || value === 0 ? '—' : `${price3.format(value)} USD`, value);
}

interface Metric {
  label: string;
  total: Cell;
  latestDay: Cell;
}

function buildMetrics(totals?: PeriodStats, latestDay?: PeriodStats | null): Metric[] {
  return [
    {
      label: 'Fees collected',
      total: fmtUsd(totals?.feesCollectedUsd),
      latestDay: fmtUsd(latestDay?.feesCollectedUsd),
    },
    {
      label: 'Fees after basic expenses',
      total: fmtUsd(totals?.feesAfterExpensesUsd),
      latestDay: fmtUsd(latestDay?.feesAfterExpensesUsd),
    },
    {
      label: 'CELO accrued for the Community Fund',
      total: fmtCelo(totals?.celoToCommunityFund),
      latestDay: fmtCelo(latestDay?.celoToCommunityFund),
    },
    {
      label: 'USD value accrued for the Community Fund',
      total: fmtUsd(totals?.usdToCommunityFund),
      latestDay: fmtUsd(latestDay?.usdToCommunityFund),
    },
    {
      label: 'Average CELO price',
      total: fmtPrice(totals?.avgCeloPriceUsd),
      latestDay: fmtPrice(latestDay?.avgCeloPriceUsd),
    },
  ];
}

export default function Page() {
  const { stats, view, refreshFailed } = useBuybackStats();

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
        , Celo L2 sequencer fees — after L1 operating costs and the OP Superchain share — are used
        to acquire CELO for the Community Fund, where CELO holders govern their use (which may
        include burning). Figures are estimates computed from gross daily fee P&amp;L, the same data
        as the operator distribution report, not settled amounts; actual transfers to the Community
        Fund are executed in periodic batches. Totals leave out earlier revenue, which was already
        returned to the Community Fund in a single transfer of 1,748,950 CELO (see{' '}
        <Link href="/governance/cgp-234" className="underline">
          CGP-234
        </Link>
        ).
      </p>

      {view === 'error' ? (
        <ErrorNotice />
      ) : view === 'loading' ? (
        <StatsSkeleton />
      ) : (
        <StatsTable metrics={buildMetrics(stats?.totals, stats?.latestDayStats)} />
      )}

      <Footnote
        sinceDay={stats?.sinceDay}
        latestDay={stats?.latestDay}
        updatedAt={stats?.updatedAt}
        refreshFailed={refreshFailed}
      />
    </Section>
  );
}

function StatsTable({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="overflow-hidden border border-taupe-300 bg-white">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-taupe-300 bg-taupe-100 px-4 py-3 text-xs uppercase tracking-wide text-taupe-600 sm:grid-cols-[1fr_10rem_10rem]">
        <span>Metric</span>
        <span className="text-right">Total</span>
        <span className="hidden text-right sm:block">Latest day</span>
      </div>
      {metrics.map((m) => (
        <div
          key={m.label}
          className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-taupe-300 px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_10rem_10rem]"
        >
          <span className="text-sm">{m.label}</span>
          <div className="flex flex-col items-end sm:contents">
            <span
              className={clsx(
                'whitespace-nowrap text-right font-serif text-lg sm:text-xl',
                m.total.negative ? 'text-red-600' : 'text-green-600',
              )}
            >
              {m.total.text}
            </span>
            {/* Below `sm` the column header is hidden, so the value names its own period. */}
            <span
              className={clsx(
                'whitespace-nowrap text-right text-xs sm:font-serif sm:text-lg',
                m.latestDay.negative ? 'text-red-600' : 'text-taupe-600 sm:text-green-600',
              )}
            >
              <span className="sm:hidden">Latest day: </span>
              {m.latestDay.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="border border-taupe-300 bg-white">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-taupe-300 px-4 py-3.5 last:border-b-0"
        >
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}

function ErrorNotice() {
  return (
    <div className="border border-taupe-300 bg-white p-6 text-center text-sm text-taupe-600">
      Buyback stats are temporarily unavailable. The server needs a Dune API key (
      <span className="font-mono">DUNE_API_KEY</span>) and a reachable Dune API; please try again
      later.
    </div>
  );
}

function Footnote({
  sinceDay,
  latestDay,
  updatedAt,
  refreshFailed,
}: {
  sinceDay?: string;
  latestDay?: string | null;
  updatedAt?: string | null;
  refreshFailed?: boolean;
}) {
  const parts: string[] = [];
  if (sinceDay && latestDay) parts.push(`Data ${sinceDay} to ${latestDay} (UTC days)`);
  const refreshed = updatedAt ? new Date(updatedAt) : null;
  if (refreshed && !Number.isNaN(refreshed.getTime())) {
    parts.push(`Dune refreshed ${refreshed.toUTCString()}`);
  }
  if (refreshFailed) parts.push('latest update failed, showing the last loaded figures');
  if (isBuybackDataStale(updatedAt, new Date())) parts.push('data may be out of date');

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
