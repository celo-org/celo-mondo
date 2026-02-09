import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { SolidButtonWithSpinner } from 'src/components/buttons/SolidButtonWithSpinner';
import { HeaderAndSubheader } from 'src/components/layout/HeaderAndSubheader';
import { Amount } from 'src/components/numbers/Amount';
import {
  PendingStCELOWithdrawal,
  useWithdrawals,
} from 'src/features/staking/stCELO/hooks/useWithdrawals';
import { claim } from 'src/utils/stCELOAPI';
import { getFullDateHumanDateString, getHumanReadableDuration } from 'src/utils/time';
import { useAccount } from 'wagmi';

interface PendingWithdrawalsProps {
  pendingWithdrawals: PendingStCELOWithdrawal[];
}

export const PendingWithdrawalsTable = ({ pendingWithdrawals }: PendingWithdrawalsProps) => {
  const { address } = useAccount();
  const { loadPendingWithdrawals } = useWithdrawals();
  const { isLoading, refetch } = useQuery({
    queryKey: [address],
    queryFn: () => claim(address!),
    enabled: false,
  });

  const _claim = useCallback(async () => {
    await refetch();
    toast.success('All available stCELO withdrawn', { autoClose: 1200 });
    await loadPendingWithdrawals();
  }, [loadPendingWithdrawals, refetch]);

  if (pendingWithdrawals.length === 0) {
    return (
      <HeaderAndSubheader
        header="No withdrawals available"
        subHeader={`You are not currently untaking any stCELO. Once you unstake, the withdrawals will show here.`}
        className="my-10"
      ></HeaderAndSubheader>
    );
  }

  return (
    <div className="w-full">
      {pendingWithdrawals.map(({ amount, timestamp }) => (
        <PendingWithdrawal
          key={timestamp}
          amount={amount}
          timestamp={timestamp}
          claim={_claim}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

export const PendingWithdrawal = ({
  amount,
  timestamp,
  isLoading,
  claim,
}: PendingStCELOWithdrawal & { claim: () => void; isLoading: boolean }) => {
  const now = Date.now();
  const date = parseInt(timestamp, 10) * 1000;
  const isClaiming = now > date;

  return (
    <div
      className="tooltip-neutral tooltip tooltip-left flex w-full flex-row items-center gap-10 border-b border-taupe-300 px-2 py-3 text-center"
      data-tip={getFullDateHumanDateString(date)}
    >
      <Amount valueWei={amount} className="text-lg" />
      <div className="flex w-full flex-row items-center justify-between gap-4 text-[14px] text-taupe-600">
        {isClaiming ? (
          <>
            <span>Available to claim</span>
            <SolidButtonWithSpinner
              isLoading={isLoading}
              onClick={claim}
              loadingText="Claiming…"
              disabled={!isClaiming || isLoading}
              className="self-end py-2 text-xs"
            >
              Claim
            </SolidButtonWithSpinner>
          </>
        ) : (
          `Available in ${getHumanReadableDuration(date - now)}`
        )}
      </div>
    </div>
  );
};
