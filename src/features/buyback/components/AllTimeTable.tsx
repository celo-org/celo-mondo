import clsx from 'clsx';
import Link from 'next/link';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { celoscanTx } from 'src/features/buyback/addresses';
import { Cell, fmtCelo, fmtUsd } from 'src/features/buyback/components/TotalsTable';
import { CGP_234_RETURN } from 'src/features/buyback/computeStats';
import { InitialPeriod, PeriodStats, SettledTransfers } from 'src/features/buyback/types';

interface Row {
  label: string;
  /** The first period, the window, and the two together. */
  cells: [Cell, Cell, Cell];
  tone: 'flow' | 'ink';
}

export function buildAllTimeRows(
  initial: InitialPeriod,
  totals: PeriodStats,
  settled: SettledTransfers | null,
): Row[] {
  const usd = (label: string, pick: (s: PeriodStats) => number, tone: Row['tone']): Row => ({
    label,
    tone,
    cells: [
      fmtUsd(pick(initial.stats)),
      fmtUsd(pick(totals)),
      fmtUsd(pick(initial.stats) + pick(totals)),
    ],
  });
  const accruedCelo = initial.stats.celoToCommunityFund + totals.celoToCommunityFund;
  return [
    usd('Fees collected', (s) => s.feesCollectedUsd, 'flow'),
    usd('L1 operating costs', (s) => s.l1CostUsd, 'ink'),
    usd('OP Superchain share (estimate)', (s) => s.opShareUsd, 'ink'),
    usd('USD value accrued for the Community Fund', (s) => s.usdToCommunityFund, 'flow'),
    {
      label: 'CELO accrued for the Community Fund (estimate)',
      tone: 'flow',
      cells: [
        fmtCelo(initial.stats.celoToCommunityFund),
        fmtCelo(totals.celoToCommunityFund),
        fmtCelo(accruedCelo),
      ],
    },
    {
      // The first period's transfer is the CGP-234 return; the window's are
      // the batches read from the chain, absent when no node was configured.
      label: 'CELO transferred to the Community Fund',
      tone: 'flow',
      cells: [
        fmtCelo(CGP_234_RETURN.celo),
        fmtCelo(settled?.celo),
        fmtCelo(settled ? settled.celo + CGP_234_RETURN.celo : undefined),
      ],
    },
  ];
}

const toneClass = (cell: Cell, tone: Row['tone']) =>
  cell.negative ? 'text-red-600' : tone === 'flow' ? 'text-green-600' : 'text-black';

/** The first period, the window and their sum side by side: the figures since the L2 launch. */
export function AllTimeTable({
  initial,
  totals,
  sinceDay,
  settled,
}: {
  initial: InitialPeriod;
  totals: PeriodStats;
  /** First day of the window. */
  sinceDay: string;
  settled: SettledTransfers | null;
}) {
  // The heading names the launch day, so the first column only needs its end.
  const columns = [`Through ${initial.throughDay}`, `Since ${sinceDay}`, 'All time'];
  // Below `sm` the column headers are hidden, so each value names its period.
  const prefixes = ['First period: ', `Since ${sinceDay}: `, 'All time: '];
  return (
    <section aria-labelledby="buyback-all-time" className="space-y-2">
      <h2 id="buyback-all-time" className="text-sm text-taupe-600">
        Since the L2 launch ({initial.sinceDay})
      </h2>
      <div className="overflow-hidden border border-taupe-300 bg-white">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-taupe-300 bg-taupe-100 px-4 py-3 text-xs uppercase tracking-wide text-taupe-600 sm:grid-cols-[1fr_9rem_9rem_9rem]">
          <span>Metric</span>
          {columns.map((column, i) => (
            <span key={column} className={clsx('text-right', i < 2 ? 'hidden sm:block' : '')}>
              {column}
            </span>
          ))}
        </div>
        {buildAllTimeRows(initial, totals, settled).map((row) => (
          <div
            key={row.label}
            data-testid="all-time-row"
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-taupe-300 px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_9rem_9rem_9rem]"
          >
            <span className="text-sm">{row.label}</span>
            <div className="flex flex-col items-end sm:contents">
              {row.cells.map((cell, i) => (
                <span
                  key={columns[i]}
                  className={clsx(
                    'whitespace-nowrap text-right',
                    i === 2 ? 'font-serif text-lg' : 'text-xs sm:font-serif sm:text-lg',
                    toneClass(cell, row.tone),
                  )}
                >
                  <span className="sm:hidden">{prefixes[i]}</span>
                  {cell.text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-taupe-600">
        The first period was settled by a single return of {fmtCelo(CGP_234_RETURN.celo).text} on{' '}
        {CGP_234_RETURN.day} (
        <Link href="/governance/cgp-234" className="underline">
          CGP-234
        </Link>
        ,{' '}
        <A_Blank href={celoscanTx(CGP_234_RETURN.txHash)} className="underline">
          transaction
        </A_Blank>
        ), the operator&apos;s figure. Its estimate here values each day&apos;s revenue at that
        day&apos;s prices, like the window&apos;s, and is not what was transferred.
      </p>
    </section>
  );
}
