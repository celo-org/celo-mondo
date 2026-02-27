import { Disclosure, DisclosureButton, DisclosurePanel, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { SolidButtonWithSpinner } from 'src/components/buttons/SolidButtonWithSpinner';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { HeaderAndSubheader } from 'src/components/layout/HeaderAndSubheader';
import { Amount } from 'src/components/numbers/Amount';
import {
  PendingStCELOWithdrawal,
  StCELOWithdrawalEntry,
  useWithdrawals,
} from 'src/features/staking/stCELO/hooks/useWithdrawals';
import { claim } from 'src/utils/stCELOAPI';
import { getFullDateHumanDateString, getHumanReadableDuration } from 'src/utils/time';
import { useAccount } from 'wagmi';

interface PendingWithdrawalsProps {
  pendingWithdrawals: PendingStCELOWithdrawal[];
  isWaitingForNewWithdrawal?: boolean;
  scheduledWithdrawalAmount?: bigint;
}

export const PendingWithdrawalsTable = ({
  pendingWithdrawals,
  isWaitingForNewWithdrawal,
  scheduledWithdrawalAmount,
}: PendingWithdrawalsProps) => {
  const { address } = useAccount();
  const { loadPendingWithdrawals } = useWithdrawals();
  const { isLoading, refetch } = useQuery({
    queryKey: ['stcelo-claim', address],
    queryFn: () => claim(address!),
    enabled: false,
  });

  const _claim = useCallback(async () => {
    await refetch();
    toast.success('All available stCELO withdrawn', { autoClose: 1200 });
    await loadPendingWithdrawals();
  }, [loadPendingWithdrawals, refetch]);

  const hasScheduled = !!scheduledWithdrawalAmount && scheduledWithdrawalAmount > 0n;

  if (pendingWithdrawals.length === 0 && !isWaitingForNewWithdrawal && !hasScheduled) {
    return (
      <HeaderAndSubheader
        header="No withdrawals available"
        subHeader={`You are not currently unstaking any stCELO. Once you unstake, the withdrawals will show here.`}
        className="my-10"
      ></HeaderAndSubheader>
    );
  }

  return (
    <div className="w-full">
      {hasScheduled && <ScheduledWithdrawalRow amount={scheduledWithdrawalAmount} />}
      {pendingWithdrawals.map(({ amount, timestamp, entries }) =>
        entries ? (
          <ExpandableWithdrawalGroup
            key={timestamp}
            amount={amount}
            timestamp={timestamp}
            entries={entries}
            claim={_claim}
            isLoading={isLoading}
          />
        ) : (
          <PendingWithdrawal
            key={timestamp}
            amount={amount}
            timestamp={timestamp}
            claim={_claim}
            isLoading={isLoading}
          />
        ),
      )}
      {isWaitingForNewWithdrawal && !hasScheduled && (
        <div className="flex w-full flex-row items-center gap-10 border-b border-taupe-300 px-2 py-3 text-center">
          <div className="h-6 w-24 animate-pulse rounded bg-taupe-300" />
          <div className="h-6 w-40 animate-pulse rounded bg-taupe-300" />
        </div>
      )}
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

const ScheduledWithdrawalRow = ({ amount }: { amount: bigint }) => {
  return (
    <div className="flex w-full flex-row items-center gap-10 border-b border-taupe-300 px-2 py-3 text-center">
      <Amount valueWei={amount} className="text-lg" />
      <div className="flex w-full flex-row items-center gap-4 text-[14px] text-taupe-600">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-purple-500" />
          Processing…
        </span>
      </div>
    </div>
  );
};

const ExpandableWithdrawalGroup = ({
  amount,
  timestamp,
  entries,
  isLoading,
  claim,
}: {
  amount: bigint;
  timestamp: string;
  entries: StCELOWithdrawalEntry[];
  claim: () => void;
  isLoading: boolean;
}) => {
  const now = Date.now();
  const date = parseInt(timestamp, 10) * 1000;
  const isClaiming = now > date;

  return (
    <Disclosure defaultOpen>
      {({ open }) => (
        <div className="border-b border-taupe-300">
          <DisclosureButton className="flex w-full flex-row items-center gap-3 px-2 py-3 text-center">
            <div className="flex items-center gap-1.5">
              <ChevronIcon direction={open ? 'n' : 's'} width={10} height={8} />
              <span className="grid min-h-[20px] min-w-[20px] place-items-center rounded-full bg-taupe-300 text-[10px]">
                {entries.length}
              </span>
            </div>
            <Amount valueWei={amount} className="text-lg" />
            <div className="flex w-full flex-row items-center justify-between gap-4 text-[14px] text-taupe-600">
              {isClaiming ? (
                <>
                  <span>Available to claim</span>
                  <SolidButtonWithSpinner
                    isLoading={isLoading}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      claim();
                    }}
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
          </DisclosureButton>
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <DisclosurePanel>
              {entries.map((entry, index) => {
                const entryDate = parseInt(entry.timestamp, 10) * 1000;
                return (
                  <div
                    key={`${entry.timestamp}-${index}`}
                    className="flex w-full flex-row items-center gap-10 border-t border-taupe-300/50 bg-taupe-300/20 px-2 py-2 pl-14 text-center text-taupe-600"
                  >
                    <Amount valueWei={entry.amount} className="text-sm" />
                    <span className="text-xs">
                      {entryDate < Date.now()
                        ? 'Available'
                        : `Available in ${getHumanReadableDuration(entryDate - Date.now())}`}
                    </span>
                  </div>
                );
              })}
            </DisclosurePanel>
          </Transition>
        </div>
      )}
    </Disclosure>
  );
};
