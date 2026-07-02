'use client';

import clsx from 'clsx';
import { SkeletonBlock } from 'src/components/animation/Skeleton';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { Section } from 'src/components/layout/Section';
import { CeloGlyph } from 'src/components/logos/Celo';
import { H1 } from 'src/components/text/headers';
import { PeriodStats } from 'src/features/buyback/types';
import { useBuybackStats } from 'src/features/buyback/useBuybackStats';

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

function fmtUsd(value?: number): Cell {
  return cell(value == null ? '—' : `${usd0.format(Math.round(value))} USD`, value);
}

function fmtCelo(value?: number): Cell {
  return cell(value == null ? '—' : `${usd0.format(Math.round(value))} CELO`, value);
}

function fmtPrice(value?: number): Cell {
  return cell(value == null || value === 0 ? '—' : `${price3.format(value)} USD`, value);
}

interface Metric {
  label: string;
  total: Cell;
  last24h: Cell;
}

function buildMetrics(totals?: PeriodStats, last24h?: PeriodStats | null): Metric[] {
  return [
    {
      label: 'Fees collected',
      total: fmtUsd(totals?.feesCollectedUsd),
      last24h: fmtUsd(last24h?.feesCollectedUsd),
    },
    {
      label: 'Fees after basic expenses',
      total: fmtUsd(totals?.feesAfterExpensesUsd),
      last24h: fmtUsd(last24h?.feesAfterExpensesUsd),
    },
    {
      label: 'CELO bought and burned',
      total: fmtCelo(totals?.celoBoughtAndBurned),
      last24h: fmtCelo(last24h?.celoBoughtAndBurned),
    },
    {
      label: 'USD spent for CELO buyback and burn',
      total: fmtUsd(totals?.usdSpentOnBuyback),
      last24h: fmtUsd(last24h?.usdSpentOnBuyback),
    },
    {
      label: 'Average CELO buyback price',
      total: fmtPrice(totals?.avgBuybackPriceUsd),
      last24h: fmtPrice(last24h?.avgBuybackPriceUsd),
    },
  ];
}

export default function Page() {
  const { stats, isLoading, isError } = useBuybackStats();

  return (
    <Section className="mt-6" containerClassName="space-y-6 max-w-screen-md">
      <div className="flex items-center space-x-3">
        <CeloGlyph width={34} height={34} />
        <H1>CELO Buyback &amp; Burn</H1>
      </div>

      <p className="max-w-xl text-sm text-taupe-600">
        Celo L2 sequencer fees fund an on-going CELO buyback &amp; burn under{' '}
        <A_Blank
          href="https://forum.celo.org/t/celoccelerate-celo-tokenomics-proposal/13147"
          className="underline"
        >
          CELOccelerate (CGP-286)
        </A_Blank>
        . Figures are derived from the same daily P&amp;L data as the operator distribution report.
      </p>

      {isError ? (
        <ErrorNotice />
      ) : isLoading ? (
        <StatsSkeleton />
      ) : (
        <StatsTable metrics={buildMetrics(stats?.totals, stats?.last24h)} />
      )}

      <Footnote latestDay={stats?.latestDay} updatedAt={stats?.updatedAt} />
    </Section>
  );
}

function StatsTable({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="overflow-hidden border border-taupe-300 bg-white">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-taupe-300 bg-taupe-100 px-4 py-3 text-xs uppercase tracking-wide text-taupe-600 sm:grid-cols-[1fr_9rem_9rem]">
        <span>Metric</span>
        <span className="text-right">Total</span>
        <span className="hidden text-right sm:block">Last 24 hrs</span>
      </div>
      {metrics.map((m) => (
        <div
          key={m.label}
          className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-taupe-300 px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_9rem_9rem]"
        >
          <span className="text-sm">{m.label}</span>
          <div className="flex flex-col items-end sm:contents">
            <span
              className={clsx(
                'text-right font-serif text-lg sm:text-xl',
                m.total.negative ? 'text-red-600' : 'text-green-600',
              )}
            >
              {m.total.text}
            </span>
            <span
              className={clsx(
                'text-right text-xs text-taupe-600 sm:font-serif sm:text-lg',
                m.last24h.negative ? 'sm:text-red-600' : 'sm:text-green-600',
              )}
            >
              {m.last24h.text}
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
      Buyback stats are unavailable right now. The dashboard needs a Dune API key (
      <span className="font-mono">DUNE_API_KEY</span>) to be configured on the server.
    </div>
  );
}

function Footnote({ latestDay, updatedAt }: { latestDay?: string | null; updatedAt?: string }) {
  const parts: string[] = [];
  // Dune returns the day as a full timestamp ("2026-06-18 00:00:00.000 UTC");
  // only the date part is meaningful here.
  if (latestDay) parts.push(`Data through ${latestDay.slice(0, 10)}`);
  if (updatedAt) parts.push(`updated ${new Date(updatedAt).toUTCString()}`);

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
