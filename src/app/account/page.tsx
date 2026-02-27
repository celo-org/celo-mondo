'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useMemo } from 'react';
import { SkeletonBlock } from 'src/components/animation/Skeleton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { Section } from 'src/components/layout/Section';
import { Amount } from 'src/components/numbers/Amount';
import { TokenId } from 'src/config/tokens';
import { useBalance, useStCELOBalance, useVoteSignerToAccount } from 'src/features/account/hooks';
import { DelegationsTable } from 'src/features/delegation/components/DelegationsTable';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { useDelegationBalances } from 'src/features/delegation/hooks/useDelegationBalances';
import { Delegatee, DelegationAmount } from 'src/features/delegation/types';
import { ProposalVotesHistoryTable } from 'src/features/governance/components/ProposalVotesHistoryTable';
import { LockActionType, LockedBalances } from 'src/features/locking/types';
import { useLockedStatus } from 'src/features/locking/useLockedStatus';
import { getTotalLockedCelo, getTotalUnlockedCelo } from 'src/features/locking/utils';
import { ActiveStakesTable } from 'src/features/staking/ActiveStakesTable';
import { RewardsTable } from 'src/features/staking/rewards/RewardsTable';
import { useStakingRewards } from 'src/features/staking/rewards/useStakingRewards';
import { ActiveStrategyTable } from 'src/features/staking/stCELO/ActiveStrategyTable';
import { useAnnualProjectedRate } from 'src/features/staking/stCELO/hooks/useAnnualProjectedRate';
import {
  PendingStCELOWithdrawal,
  useWithdrawals,
} from 'src/features/staking/stCELO/hooks/useWithdrawals';
import { PendingWithdrawalsTable } from 'src/features/staking/stCELO/PendingWithdrawalsTable';
import { GroupToStake, StakeActionType, StakingBalances } from 'src/features/staking/types';
import {
  useActivateStake,
  usePendingStakingActivations,
} from 'src/features/staking/useStakingActivation';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { ValidatorGroup } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import LockIcon from 'src/images/icons/lock.svg';
import StakingIcon from 'src/images/icons/staking.svg';
import UnlockIcon from 'src/images/icons/unlock.svg';
import WithdrawIcon from 'src/images/icons/withdraw.svg';
import { shortenAddress } from 'src/utils/addresses';
import { usePageInvariant } from 'src/utils/navigation';
import { StakingMode, useStakingMode } from 'src/utils/useStakingMode';
import useTabs from 'src/utils/useTabs';
import { Address } from 'viem';
import { useAccount } from 'wagmi';

export default function Page() {
  const account = useAccount();
  const address = account?.address;
  usePageInvariant(!!address, '/');

  const { signingFor, isVoteSigner } = useVoteSignerToAccount(address);
  const { balance: walletBalance } = useBalance(signingFor);
  const { stCELOBalances } = useStCELOBalance(address);
  const { lockedBalances } = useLockedStatus(signingFor);
  const { delegations } = useDelegationBalances(signingFor);
  const { addressToDelegatee } = useDelegatees();
  const { stakeBalances, groupToStake, refetch: refetchStakes } = useStakingBalances(signingFor);
  const { totalRewardsWei, groupToReward } = useStakingRewards(signingFor, groupToStake);
  const { groupToIsActivatable, refetch: refetchActivations } = usePendingStakingActivations(
    signingFor,
    groupToStake,
  );
  const { mode } = useStakingMode();
  const { addressToGroup } = useValidatorGroups(mode === 'stCELO');
  const withdrawals = useWithdrawals(address);

  const { activateStake } = useActivateStake(() => {
    refetchStakes();
    refetchActivations();
  });
  const totalLocked = getTotalLockedCelo(lockedBalances);
  const totalBalance = (walletBalance || 0n) + totalLocked;
  const totalDelegated = (BigInt(Math.floor(delegations?.totalPercent || 0)) * totalLocked) / 100n;

  if (!addressToGroup) {
    return (
      <Section className="mt-6" containerClassName="space-y-6 px-4 max-w-screen-md">
        <AccountPageSkeleton />
      </Section>
    );
  }

  return (
    <Section className="mt-6" containerClassName="space-y-6 px-4 max-w-screen-md">
      <h1 className="hidden font-serif text-3xl sm:block">Account</h1>
      <div className="items-top flex justify-between md:gap-x-40">
        <div>
          <h2>Total Balance</h2>
          <Amount valueWei={totalBalance} className="-mt-1 text-3xl md:text-4xl" />
        </div>
        {isVoteSigner ? (
          <div className="align-right flex flex-col items-end">
            <h2 className="font-medium">Vote Signer For</h2>
            <span className="hidden font-mono text-sm md:flex">{signingFor}</span>
            <span className="font-mono text-sm md:hidden">{shortenAddress(signingFor!)}</span>
          </div>
        ) : (
          <LockButtons className="hidden md:flex" mode={mode} />
        )}
      </div>
      {mode === 'CELO' ? (
        <AccountStats
          walletBalance={walletBalance}
          lockedBalances={lockedBalances}
          stakeBalances={stakeBalances}
          totalRewards={totalRewardsWei}
          totalDelegated={totalDelegated}
        />
      ) : (
        <StCELOAccountStats
          stCELOBalances={stCELOBalances}
          withdrawals={withdrawals.pendingWithdrawals}
          scheduledWithdrawalAmount={withdrawals.scheduledWithdrawalAmount}
        />
      )}
      {isVoteSigner || <LockButtons className="flex justify-between md:hidden" mode={mode} />}
      <TableTabs
        groupToStake={groupToStake}
        addressToGroup={addressToGroup}
        groupToReward={groupToReward}
        groupToIsActivatable={groupToIsActivatable}
        delegateeToAmount={delegations?.delegateeToAmount}
        addressToDelegatee={addressToDelegatee}
        activateStake={activateStake}
        mode={mode}
        withdrawals={withdrawals.pendingWithdrawals}
        isWaitingForNewWithdrawal={withdrawals.isWaitingForNewWithdrawal}
        scheduledWithdrawalAmount={withdrawals.scheduledWithdrawalAmount}
      />
    </Section>
  );
}

function LockButtons({ className, mode }: { className?: string; mode: StakingMode }) {
  const showTxModal = useTransactionModal();

  return useMemo(() => {
    if (mode === 'stCELO') {
      return (
        <div className={`space-x-2 ${className}`}>
          <SolidButton
            className="bg-primary text-primary-content"
            onClick={() =>
              showTxModal(TransactionFlowType.StakeStCELO, { action: StakeActionType.Stake })
            }
          >
            <div className="flex items-center space-x-1.5">
              <Image src={StakingIcon} width={12} height={12} alt="" />
              <span>Stake</span>
            </div>
          </SolidButton>
          <SolidButton
            className="bg-primary text-primary-content"
            onClick={() =>
              showTxModal(TransactionFlowType.UnstakeStCELO, { action: StakeActionType.Unstake })
            }
          >
            <div className="flex items-center space-x-1.5">
              <Image src={WithdrawIcon} width={12} height={12} alt="" />
              <span>Unstake</span>
            </div>
          </SolidButton>
        </div>
      );
    }
    return (
      <div className={`space-x-2 ${className}`}>
        <SolidButton
          className="bg-primary text-primary-content"
          onClick={() => showTxModal(TransactionFlowType.Lock, { action: LockActionType.Lock })}
        >
          <div className="flex items-center space-x-1.5">
            <Image src={LockIcon} width={12} height={12} alt="" />
            <span>Lock</span>
          </div>
        </SolidButton>
        <SolidButton
          className="bg-primary text-primary-content"
          onClick={() => showTxModal(TransactionFlowType.Lock, { action: LockActionType.Unlock })}
        >
          <div className="flex items-center space-x-1.5">
            <Image src={UnlockIcon} width={12} height={12} alt="" />
            <span>Unlock</span>
          </div>
        </SolidButton>
        <SolidButton
          className="bg-primary text-primary-content"
          onClick={() => showTxModal(TransactionFlowType.Lock, { action: LockActionType.Withdraw })}
        >
          <div className="flex items-center space-x-1.5">
            <Image src={WithdrawIcon} width={12} height={12} alt="" />
            <span>Withdraw</span>
          </div>
        </SolidButton>
      </div>
    );
  }, [className, mode, showTxModal]);
}

function AccountStats({
  walletBalance,
  lockedBalances,
  stakeBalances,
  totalRewards,
  totalDelegated,
}: {
  walletBalance?: bigint;
  lockedBalances?: LockedBalances;
  stakeBalances?: StakingBalances;
  totalRewards?: bigint;
  totalDelegated?: bigint;
}) {
  return (
    <div className="flex items-center justify-between">
      <AccountStat
        title="Total locked"
        valueWei={lockedBalances?.locked}
        subtitle="Delegated"
        subValueWei={totalDelegated}
      />
      <AccountStat
        title="Total unlocked"
        valueWei={getTotalUnlockedCelo(lockedBalances, walletBalance)}
        subtitle="Pending free"
        subValueWei={lockedBalances?.pendingFree}
      />
      <AccountStat
        title="Total staked"
        valueWei={stakeBalances?.total}
        subtitle="Rewards"
        subValueWei={totalRewards}
        subValueClassName={clsx(!!totalRewards && totalRewards > 0n && 'all:text-green-600')}
      />
    </div>
  );
}

function StCELOAccountStats({
  stCELOBalances,
  withdrawals,
  scheduledWithdrawalAmount,
}: {
  stCELOBalances: ReturnType<typeof useStCELOBalance>['stCELOBalances'];
  withdrawals: PendingStCELOWithdrawal[];
  scheduledWithdrawalAmount: bigint;
}) {
  const { annualProjectedRate } = useAnnualProjectedRate();
  const totalWithdrawals = useMemo(
    () =>
      withdrawals.reduce((agg, withdrawal) => agg + withdrawal.amount, 0n) +
      scheduledWithdrawalAmount,
    [withdrawals, scheduledWithdrawalAmount],
  );
  return (
    <div className="items-top items-top flex justify-between">
      <AccountStat
        title="Total stCELO"
        valueWei={stCELOBalances.total}
        tokenId={TokenId.stCELO}
        subtitle="Usable"
        subValueWei={stCELOBalances.usable}
      />
      <AccountStat
        tokenId={TokenId.stCELO}
        title="Total used in governance"
        valueWei={stCELOBalances.lockedVote}
      />
      <AccountStat tokenId={TokenId.stCELO} title="In Withdrawal" valueWei={totalWithdrawals} />
      <div>
        <h3 className="text-sm">{'Annual projected rate'}</h3>
        <span className="-my-0.5 flex items-baseline space-x-1 font-serif text-2xl text-green-600 md:text-3xl">
          {annualProjectedRate ? `${annualProjectedRate.toFixed(2)}%` : ''}
        </span>
      </div>
    </div>
  );
}

function AccountStat({
  title,
  valueWei,
  subtitle,
  subValueWei,
  subValueClassName,
  tokenId,
}: {
  title: string;
  valueWei?: bigint;
  subtitle?: string;
  subValueWei?: bigint;
  subValueClassName?: string;
  tokenId?: TokenId;
}) {
  return (
    <div className="">
      <h3 className="text-sm">{title}</h3>
      <Amount valueWei={valueWei} className="-my-0.5 text-2xl md:text-3xl" tokenId={tokenId} />
      {subtitle ? (
        <div
          className={`flex flex-row items-center text-sm text-taupe-600 ${subValueClassName} gap-1`}
        >
          <span>{subtitle}:</span> <Amount valueWei={subValueWei} decimals={2} tokenId={tokenId} />
        </div>
      ) : null}
    </div>
  );
}

function TabBadge({ label }: { label: string }) {
  return (
    <div className="grid min-h-[24px] min-w-[24px] place-items-center rounded-full bg-primary px-1 py-1 text-[10px]">
      {label}
    </div>
  );
}

type Tab = 'stakes' | 'rewards' | 'delegations' | 'history' | 'withdrawals';
function TableTabs({
  groupToStake,
  addressToGroup,
  groupToReward,
  groupToIsActivatable,
  delegateeToAmount,
  addressToDelegatee,
  activateStake,
  mode,
  withdrawals,
  isWaitingForNewWithdrawal,
  scheduledWithdrawalAmount,
}: {
  groupToStake?: GroupToStake;
  addressToGroup?: AddressTo<ValidatorGroup>;
  groupToReward?: AddressTo<number>;
  groupToIsActivatable?: AddressTo<boolean>;
  delegateeToAmount?: AddressTo<DelegationAmount>;
  addressToDelegatee?: AddressTo<Delegatee>;
  activateStake: (g: Address) => void;
  mode: StakingMode;
  withdrawals: PendingStCELOWithdrawal[];
  isWaitingForNewWithdrawal?: boolean;
  scheduledWithdrawalAmount?: bigint;
}) {
  const tabs: Tab[] =
    mode === 'CELO' ? ['stakes', 'rewards', 'delegations', 'history'] : ['stakes', 'withdrawals'];
  const { tab, onTabChange } = useTabs<(typeof tabs)[number]>('stakes');

  return (
    <div className="pt-2">
      <div className="flex space-x-10 border-b border-taupe-300 pb-2">
        {tabs.map((tabName) => (
          <TabHeaderButton
            key={tabName}
            isActive={tab === tabName}
            onClick={() => onTabChange(tabName)}
          >
            <span className=" flex items-center gap-2 text-sm capitalize">
              {tabName === 'stakes' && mode !== 'CELO' ? 'Strategy' : tabName}
              {tabName === 'withdrawals' &&
                mode !== 'CELO' &&
                (() => {
                  const count =
                    withdrawals.length +
                    (scheduledWithdrawalAmount && scheduledWithdrawalAmount > 0n ? 1 : 0);
                  return count > 0 ? <TabBadge label={count > 10 ? '10+' : `${count}`} /> : null;
                })()}
            </span>
          </TabHeaderButton>
        ))}
      </div>
      {tab === 'stakes' && mode === 'CELO' && (
        <ActiveStakesTable
          groupToStake={groupToStake}
          addressToGroup={addressToGroup}
          groupToIsActivatable={groupToIsActivatable}
          activateStake={activateStake}
        />
      )}
      {tab === 'stakes' && mode === 'stCELO' && (
        <ActiveStrategyTable addressToGroup={addressToGroup} />
      )}
      {tab === 'withdrawals' && mode === 'stCELO' && (
        <PendingWithdrawalsTable
          pendingWithdrawals={withdrawals}
          isWaitingForNewWithdrawal={isWaitingForNewWithdrawal}
          scheduledWithdrawalAmount={scheduledWithdrawalAmount}
        />
      )}
      {tab === 'rewards' && (
        <RewardsTable groupToReward={groupToReward} addressToGroup={addressToGroup} />
      )}
      {tab === 'delegations' && (
        <DelegationsTable
          delegateeToAmount={delegateeToAmount}
          addressToDelegatee={addressToDelegatee}
        />
      )}
      {tab === 'history' && <ProposalVotesHistoryTable />}
    </div>
  );
}

function AccountPageSkeleton() {
  return (
    <>
      <SkeletonBlock className="hidden h-8 w-32 sm:block" />
      {/* Total Balance + buttons */}
      <div className="items-top flex justify-between">
        <div className="space-y-1">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-9 w-48 md:h-10" />
        </div>
        <div className="hidden space-x-2 md:flex">
          <SkeletonBlock className="h-10 w-24 rounded-full" />
          <SkeletonBlock className="h-10 w-24 rounded-full" />
          <SkeletonBlock className="h-10 w-28 rounded-full" />
        </div>
      </div>
      {/* Stat boxes */}
      <div className="flex items-center justify-between">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-7 w-32 md:h-8" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* Tab headers */}
      <div className="pt-2">
        <div className="flex space-x-10 border-b border-taupe-300 pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-5 w-20" />
          ))}
        </div>
        {/* Table rows */}
        <table className="mt-2 w-full">
          <thead>
            <tr>
              {['w-24', 'w-20', 'w-16', 'w-16'].map((w, i) => (
                <th key={i} className="border-y border-taupe-300 px-4 py-3">
                  <SkeletonBlock className={`h-4 ${w}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, row) => (
              <tr key={row}>
                {['w-28', 'w-20', 'w-16', 'w-20'].map((w, col) => (
                  <td key={col} className="border-y border-taupe-300 px-4 py-4">
                    <SkeletonBlock className={`h-5 ${w}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
