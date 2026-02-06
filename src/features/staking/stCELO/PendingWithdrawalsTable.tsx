import { Spinner } from 'src/components/animation/Spinner';
import { Amount } from 'src/components/numbers/Amount';
import { MINUTE } from 'src/config/consts';
import { PendingStCELOWithdrawal } from 'src/features/staking/stCELO/hooks/useWithdrawals';
import { getHumanReadableDuration } from 'src/utils/time';

interface PendingWithdrawalsProps {
  pendingWithdrawals: PendingStCELOWithdrawal[];
}

export const PendingWithdrawalsTable = ({ pendingWithdrawals }: PendingWithdrawalsProps) => (
  <div className="w-full">
    {pendingWithdrawals.map(({ amount, timestamp }) => (
      <PendingWithdrawal key={timestamp} amount={amount} timestamp={timestamp} />
    ))}
  </div>
);

export const PendingWithdrawal = ({ amount, timestamp }: PendingStCELOWithdrawal) => {
  const now = Date.now();
  const date = parseInt(timestamp, 10) * 1000;
  const isClaiming = now > date;
  const isPastClaimingDate = now - 5 * MINUTE > date;

  return (
    <div className="flex w-full flex-row items-center gap-10 border-b border-taupe-300 px-2 py-3 text-center">
      <Amount valueWei={amount} className="text-lg" />
      <div className="text-[14px] text-taupe-600">
        {isClaiming ? (
          <div className="flex gap-4">
            {isPastClaimingDate ? 'Still claiming…' : 'Claiming…'}
            {isClaiming && <Spinner size="sm" />}
          </div>
        ) : (
          `Available in ${getHumanReadableDuration(date - now)}`
        )}
      </div>
    </div>
  );
};
