import Link from 'next/link';
import { A_Blank } from 'src/components/buttons/A_Blank';
import {
  CARBON_FUND,
  COMMUNITY_FUND,
  FEE_HANDLER,
  OPERATIONS_SAFE,
  SEQUENCER_FEE_VAULT,
  celoscanAddress,
} from 'src/features/buyback/addresses';
import {
  CARBON_FUND_SHARE_IN_WINDOW,
  SETTLED_REVENUE_CUTOFF_DATE,
} from 'src/features/buyback/computeStats';

const decimals2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SOURCES: Array<{ label: string; href: string }> = [
  { label: 'Dune query 6898547', href: 'https://dune.com/queries/6898547' },
  { label: 'Operator tooling', href: 'https://github.com/celo-org/celo-monorepo/pull/11774' },
  { label: 'FeeHandler', href: celoscanAddress(FEE_HANDLER) },
  { label: 'SequencerFeeVault', href: celoscanAddress(SEQUENCER_FEE_VAULT) },
  { label: 'Operations Safe', href: celoscanAddress(OPERATIONS_SAFE) },
  { label: 'Governance (Community Fund)', href: celoscanAddress(COMMUNITY_FUND) },
  { label: 'Carbon Fund', href: celoscanAddress(CARBON_FUND) },
];

export function Methodology() {
  const carbon = CARBON_FUND_SHARE_IN_WINDOW;
  return (
    <details className="border border-taupe-300 bg-white text-sm">
      <summary className="cursor-pointer px-4 py-3">How these figures are computed</summary>
      <div className="space-y-3 border-t border-taupe-300 px-4 py-3 text-black">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Revenue is CELO fees plus stablecoin fees at their USD peg, with EURm at Dune&apos;s
            forex price; COPm is left out.
          </li>
          <li>
            L1 costs are the batcher, proposer, challenger and EigenDA costs, paid in ETH and valued
            at the day&apos;s price.
          </li>
          <li>
            The OP Superchain share is the greater of 2.5% of fees and 15% of fees after L1 costs,
            an estimate per Optimism&apos;s{' '}
            <A_Blank
              href="https://docs.optimism.io/superchain/superchain-information/superchain-revenue-explainer"
              className="underline"
            >
              Standard Rollup Charter
            </A_Blank>
            .
          </li>
          <li>
            The Carbon Fund fraction is 0% since{' '}
            <Link href="/governance/cgp-236" className="underline">
              CGP-236
            </Link>
            ; the one-off share of {decimals2.format(carbon.celo)} CELO /{' '}
            {decimals2.format(carbon.usd)} USD taken on {carbon.day} is deducted.
          </li>
          <li>
            Revenue up to {SETTLED_REVENUE_CUTOFF_DATE} was already returned to the Community Fund (
            <Link href="/governance/cgp-234" className="underline">
              CGP-234
            </Link>
            ) and is not counted.
          </li>
          <li>USD and CELO are converted per day, at that day&apos;s CELO price.</li>
          <li>The average CELO price is volume-weighted: USD accrued divided by CELO accrued.</li>
        </ul>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {SOURCES.map((source) => (
            <A_Blank key={source.label} href={source.href} className="underline">
              {source.label}
            </A_Blank>
          ))}
        </p>
      </div>
    </details>
  );
}
