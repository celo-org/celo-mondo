import clsx from 'clsx';
import { SkeletonBlock } from 'src/components/animation/Skeleton';
import { CARBON_FUND_SHARE_IN_WINDOW } from 'src/features/buyback/computeStats';
import { formatPrice, formatWhole } from 'src/features/buyback/format';
import { PeriodStats } from 'src/features/buyback/types';

// A rendered stat cell. Values can legitimately go negative (a day where L1
// costs exceed revenue is a loss), so the sign travels with the text and the
// table colors losses red.
interface Cell {
  text: string;
  negative: boolean;
}

const EMPTY: Cell = { text: '—', negative: false };

// Round before deriving the sign so a value like -0.4 renders as "0", not "-0" in red.
function fmtWhole(value: number | undefined, unit: string): Cell {
  if (value == null) return EMPTY;
  const rounded = Math.round(value) || 0;
  return { text: `${formatWhole(rounded)} ${unit}`, negative: rounded < 0 };
}

export const fmtUsd = (value?: number): Cell => fmtWhole(value, 'USD');
export const fmtCelo = (value?: number): Cell => fmtWhole(value, 'CELO');

function fmtPrice(value?: number): Cell {
  if (value == null || value === 0) return EMPTY;
  return { text: `${formatPrice(value)} USD`, negative: value < 0 };
}

interface Metric {
  label: string;
  total: Cell;
  latestDay: Cell;
  /** Money reaching the Community Fund reads green; costs and context stay in ink. */
  tone: 'flow' | 'ink';
}

export function buildMetrics(totals?: PeriodStats, latestDay?: PeriodStats | null): Metric[] {
  return [
    {
      label: 'Fees collected',
      total: fmtUsd(totals?.feesCollectedUsd),
      latestDay: fmtUsd(latestDay?.feesCollectedUsd),
      tone: 'flow',
    },
    {
      label: 'L1 operating costs',
      total: fmtUsd(totals?.l1CostUsd),
      latestDay: fmtUsd(latestDay?.l1CostUsd),
      tone: 'ink',
    },
    {
      label: 'OP Superchain share (estimate)',
      total: fmtUsd(totals?.opShareUsd),
      latestDay: fmtUsd(latestDay?.opShareUsd),
      tone: 'ink',
    },
    {
      // Taken once, at the one distribution before CGP-236 zeroed the
      // fraction; a later day has nothing to deduct, which is a zero, not a gap.
      label: `Carbon Fund share (one-off, ${CARBON_FUND_SHARE_IN_WINDOW.day})`,
      total: fmtUsd(totals?.carbonFundUsd),
      latestDay: fmtUsd(latestDay?.carbonFundUsd),
      tone: 'ink',
    },
    {
      label: 'USD value accrued for the Community Fund',
      total: fmtUsd(totals?.usdToCommunityFund),
      latestDay: fmtUsd(latestDay?.usdToCommunityFund),
      tone: 'flow',
    },
    {
      label: 'CELO accrued for the Community Fund',
      total: fmtCelo(totals?.celoToCommunityFund),
      latestDay: fmtCelo(latestDay?.celoToCommunityFund),
      tone: 'flow',
    },
    {
      label: 'Average CELO price',
      total: fmtPrice(totals?.avgCeloPriceUsd),
      latestDay: fmtPrice(latestDay?.avgCeloPriceUsd),
      tone: 'ink',
    },
  ];
}

const toneClass = (cell: Cell, tone: Metric['tone']) =>
  cell.negative ? 'text-red-600' : tone === 'flow' ? 'text-green-600' : 'text-black';

export function TotalsTable({
  totals,
  latestDay,
  sinceDay,
}: {
  totals: PeriodStats;
  latestDay: PeriodStats | null;
  sinceDay: string;
}) {
  return (
    <section aria-labelledby="buyback-totals" className="space-y-2">
      <h2 id="buyback-totals" className="text-sm text-taupe-600">
        Since {sinceDay}
      </h2>
      <div className="overflow-hidden border border-taupe-300 bg-white">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-taupe-300 bg-taupe-100 px-4 py-3 text-xs uppercase tracking-wide text-taupe-600 sm:grid-cols-[1fr_10rem_10rem]">
          <span>Metric</span>
          <span className="text-right">Total</span>
          <span className="hidden text-right sm:block">Latest day</span>
        </div>
        {buildMetrics(totals, latestDay).map((m) => (
          <div
            key={m.label}
            data-testid="totals-row"
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-taupe-300 px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_10rem_10rem]"
          >
            <span className="text-sm">{m.label}</span>
            <div className="flex flex-col items-end sm:contents">
              <span
                className={clsx(
                  'whitespace-nowrap text-right font-serif text-lg sm:text-xl',
                  toneClass(m.total, m.tone),
                )}
              >
                {m.total.text}
              </span>
              {/* Below `sm` the column header is hidden, so the value names its own period. */}
              <span
                className={clsx(
                  'whitespace-nowrap text-right text-xs sm:font-serif sm:text-lg',
                  m.latestDay.negative
                    ? 'text-red-600'
                    : clsx(
                        'text-taupe-600',
                        m.tone === 'flow' ? 'sm:text-green-600' : 'sm:text-black',
                      ),
                )}
              >
                <span className="sm:hidden">Latest day: </span>
                {m.latestDay.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TotalsSkeleton() {
  return (
    <div className="border border-taupe-300 bg-white">
      {Array.from({ length: 7 }).map((_, i) => (
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
