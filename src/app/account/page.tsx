'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { Section } from 'src/components/layout/Section';
import { Amount, formatNumberString } from 'src/components/numbers/Amount';
import { useBalance } from 'src/features/account/hooks';
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
import { GroupToStake, StakingBalances } from 'src/features/staking/types';
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
import UnlockIcon from 'src/images/icons/unlock.svg';
import WithdrawIcon from 'src/images/icons/withdraw.svg';
import { usePageInvariant } from 'src/utils/navigation';
import { useAccount } from 'wagmi';

export default function Page() {
  const account = useAccount();
  const address = account?.address;
  usePageInvariant(!!address, '/');

  const { balance: walletBalance } = useBalance(address);
  const { lockedBalances } = useLockedStatus(address);
  const { delegations } = useDelegationBalances(address);
  const { addressToDelegatee } = useDelegatees();
  const { stakeBalances, groupToStake, refetch: refetchStakes } = useStakingBalances(address);
  const { totalRewardsWei, groupToReward } = useStakingRewards(address, groupToStake);
  const { groupToIsActivatable, refetch: refetchActivations } = usePendingStakingActivations(
    address,
    groupToStake,
  );
  const { addressToGroup } = useValidatorGroups();

  const { activateStake } = useActivateStake(() => {
    refetchStakes();
    refetchActivations();
  });

  const totalLocked = getTotalLockedCelo(lockedBalances);
  const totalBalance = (walletBalance || 0n) + totalLocked;
  const totalDelegated = (BigInt(delegations?.totalPercent || 0) * totalLocked) / 100n;

  return (
    <Section className="mt-6" containerClassName="space-y-6 px-4">
      <h1 className="hidden font-serif text-3xl sm:block">Dashboard</h1>
      <div className="flex items-center justify-between md:gap-x-40">
        <div>
          <h2>Total Balance</h2>
          <Amount valueWei={totalBalance} className="-mt-1 text-3xl md:text-4xl" />
        </div>
        <LockButtons className="hidden md:flex" />
      </div>
      <AccountStats
        walletBalance={walletBalance}
        lockedBalances={lockedBalances}
        stakeBalances={stakeBalances}
        totalRewards={totalRewardsWei}
        totalDelegated={totalDelegated}
      />
      <LockButtons className="flex justify-between md:hidden" />
      <TableTabs
        groupToStake={groupToStake}
        addressToGroup={addressToGroup}
        groupToReward={groupToReward}
        groupToIsActivatable={groupToIsActivatable}
        delegateeToAmount={delegations?.delegateeToAmount}
        addressToDelegatee={addressToDelegatee}
        activateStake={activateStake}
      />
    </Section>
  );
}

function LockButtons({ className }: { className?: string }) {
  const showTxModal = useTransactionModal();

  return (
    <div className={`space-x-2 ${className}`}>
      <SolidButton
        onClick={() => showTxModal(TransactionFlowType.Lock, { action: LockActionType.Lock })}
      >
        <div className="flex items-center space-x-1.5">
          <Image src={LockIcon} width={12} height={12} alt="" />
          <span>Lock</span>
        </div>
      </SolidButton>
      <SolidButton
        onClick={() => showTxModal(TransactionFlowType.Lock, { action: LockActionType.Unlock })}
      >
        <div className="flex items-center space-x-1.5">
          <Image src={UnlockIcon} width={12} height={12} alt="" />
          <span>Unlock</span>
        </div>
      </SolidButton>
      <SolidButton
        onClick={() => showTxModal(TransactionFlowType.Lock, { action: LockActionType.Withdraw })}
      >
        <div className="flex items-center space-x-1.5">
          <Image src={WithdrawIcon} width={12} height={12} alt="" />
          <span>Withdraw</span>
        </div>
      </SolidButton>
    </div>
  );
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

function AccountStat({
  title,
  valueWei,
  subtitle,
  subValueWei,
  subValueClassName,
}: {
  title: string;
  valueWei?: bigint;
  subtitle: string;
  subValueWei?: bigint;
  subValueClassName?: string;
}) {
  return (
    <div className="">
      <h3 className="text-sm">{title}</h3>
      <Amount valueWei={valueWei} className="-my-0.5 text-2xl md:text-3xl" />
      <div className={`flex items-center text-sm text-taupe-600 ${subValueClassName}`}>
        <span>{`${subtitle}: ${formatNumberString(subValueWei, 2, true)}`}</span>
      </div>
    </div>
  );
}

function TableTabs({
  groupToStake,
  addressToGroup,
  groupToReward,
  groupToIsActivatable,
  delegateeToAmount,
  addressToDelegatee,
  activateStake,
}: {
  groupToStake?: GroupToStake;
  addressToGroup?: AddressTo<ValidatorGroup>;
  groupToReward?: AddressTo<number>;
  groupToIsActivatable?: AddressTo<boolean>;
  delegateeToAmount?: AddressTo<DelegationAmount>;
  addressToDelegatee?: AddressTo<Delegatee>;
  activateStake: (g: Address) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tabs = ['stakes', 'rewards', 'delegations', 'history'] as const;
  const initialTab = (params.get('tab') as (typeof tabs)[number]) || tabs[0];
  const [tab, setTab] = useState<(typeof tabs)[number]>(initialTab);

  useEffect(() => {
    if (params.get('tab') !== tab) {
      router.push('?tab=' + tab);
    }
  }, [params, router, tab]);

  return (
    <div className="pt-2">
      <div className="flex space-x-10 border-b border-taupe-300 pb-2">
        {tabs.map((tabName) => (
          <TabHeaderButton key={tabName} isActive={tab === tabName} onClick={() => setTab(tabName)}>
            <span className="text-sm capitalize">{tabName}</span>
          </TabHeaderButton>
        ))}
      </div>
      {tab === 'stakes' && (
        <ActiveStakesTable
          groupToStake={groupToStake}
          addressToGroup={addressToGroup}
          groupToIsActivatable={groupToIsActivatable}
          activateStake={activateStake}
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
