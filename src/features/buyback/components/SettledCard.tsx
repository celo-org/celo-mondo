import { A_Blank } from 'src/components/buttons/A_Blank';
import { COMMUNITY_FUND, OPERATIONS_SAFE, celoscanAddress } from 'src/features/buyback/addresses';
import { fmtCelo } from 'src/features/buyback/components/TotalsTable';
import { SettledTransfers } from 'src/features/buyback/types';

function transfersLine(settled: SettledTransfers): string {
  if (settled.transfers === 0) return 'no batch transfer yet';
  const count = `${settled.transfers} ${settled.transfers === 1 ? 'transfer' : 'transfers'}`;
  const last = settled.lastTransferAt?.slice(0, 10);
  return last ? `${count}, last on ${last}` : count;
}

/** What has reached the Community Fund on-chain, next to what the figures say has accrued. */
export function SettledCard({
  settled,
  estimatedCelo,
}: {
  settled: SettledTransfers | null;
  estimatedCelo: number;
}) {
  return (
    <section
      aria-labelledby="buyback-settled"
      className="space-y-3 border border-taupe-300 bg-white p-4"
    >
      <h2 id="buyback-settled" className="text-sm font-medium">
        Transferred to the Community Fund so far
      </h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-taupe-600">Transferred</dt>
          {settled ? (
            <>
              <dd className="font-serif text-lg">{fmtCelo(settled.celo).text}</dd>
              <dd className="text-xs text-taupe-600">{transfersLine(settled)}</dd>
            </>
          ) : (
            <dd className="text-sm text-taupe-600">On-chain transfers not read</dd>
          )}
        </div>
        <div>
          <dt className="text-xs text-taupe-600">Estimated accrued</dt>
          <dd className="font-serif text-lg text-green-600">{fmtCelo(estimatedCelo).text}</dd>
        </div>
        {settled && (
          <div>
            {/* The estimate stops at the last complete day while the chain is read
                to its head, so a batch can run ahead of it for a while. */}
            <dt className="text-xs text-taupe-600">
              {settled.celo <= estimatedCelo
                ? 'Not yet transferred'
                : 'Transferred ahead of the estimate'}
            </dt>
            <dd className="font-serif text-lg">
              {fmtCelo(Math.abs(estimatedCelo - settled.celo)).text}
            </dd>
          </div>
        )}
      </dl>
      <p className="text-xs text-taupe-600">
        Batches are sent by the operator&apos;s 2-of-5{' '}
        <A_Blank href={celoscanAddress(OPERATIONS_SAFE)} className="underline">
          Operations Safe
        </A_Blank>{' '}
        to the{' '}
        <A_Blank href={celoscanAddress(COMMUNITY_FUND)} className="underline">
          Community Fund (Governance contract)
        </A_Blank>{' '}
        and show here once mined.
      </p>
    </section>
  );
}
