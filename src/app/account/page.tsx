'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useState } from 'react';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { Section } from 'src/components/layout/Section';
import { Amount, formatNumberString } from 'src/components/numbers/Amount';
import { useBalance } from 'src/features/account/hooks';
import { LockActionType, LockedBalances } from 'src/features/locking/types';
import { useLockedStatus } from 'src/features/locking/useLockedStatus';
import { getTotalLockedCelo, getTotalUnlockedCelo } from 'src/features/locking/utils';
import { ActiveStakesTable } from 'src/features/staking/ActiveStakesTable';
import { RewardsTable } from 'src/features/staking/rewards/RewardsTable';
import { useStakingRewards } from 'src/features/staking/rewards/useStakingRewards';
import { GroupToStake, StakingBalances } from 'src/features/staking/types';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { TxModalType } from 'src/features/transactions/types';
import { ValidatorGroup } from 'src/features/validators/types';
import { useValidatorGroups } from 'src/features/validators/useValidatorGroups';
import Lock from 'src/images/icons/lock.svg';
import Unlock from 'src/images/icons/unlock.svg';
import Withdraw from 'src/images/icons/withdraw.svg';
import { usePageInvariant } from 'src/utils/navigation';
import { useAccount } from 'wagmi';

export default function Page() {
  const account = useAccount();
  const address = account?.address;
  usePageInvariant(!!address, '/', 'No account connected');

  const { balance: walletBalance } = useBalance(address);
  const { lockedBalances } = useLockedStatus(address);
  const { stakeBalances, groupToStake } = useStakingBalances(address);
  const { totalRewardsWei, groupToReward } = useStakingRewards(address, groupToStake);
  const { addressToGroup } = useValidatorGroups();

  const totalBalance = (walletBalance || 0n) + getTotalLockedCelo(lockedBalances);

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
      />
      <LockButtons className="flex justify-between md:hidden" />
      <TableTabs
        groupToStake={groupToStake}
        addressToGroup={addressToGroup}
        groupToReward={groupToReward}
      />
    </Section>
  );
}

function LockButtons({ className }: { className?: string }) {
  const showTxModal = useTransactionModal();

  return (
    <div className={`space-x-2 ${className}`}>
      <SolidButton
        onClick={() => showTxModal(TxModalType.Lock, { defaultAction: LockActionType.Lock })}
      >
        <div className="flex items-center space-x-1.5">
          <Image src={Lock} width={12} height={12} alt="" />
          <span>Lock</span>
        </div>
      </SolidButton>
      <SolidButton
        onClick={() => showTxModal(TxModalType.Lock, { defaultAction: LockActionType.Unlock })}
      >
        <div className="flex items-center space-x-1.5">
          <Image src={Unlock} width={12} height={12} alt="" />
          <span>Unlock</span>
        </div>
      </SolidButton>
      <SolidButton
        onClick={() => showTxModal(TxModalType.Lock, { defaultAction: LockActionType.Withdraw })}
      >
        <div className="flex items-center space-x-1.5">
          <Image src={Withdraw} width={12} height={12} alt="" />
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
}: {
  walletBalance?: bigint;
  lockedBalances?: LockedBalances;
  stakeBalances?: StakingBalances;
  totalRewards?: bigint;
}) {
  return (
    <div className="flex items-center justify-between">
      <AccountStat
        title="Total locked"
        valueWei={lockedBalances?.locked}
        subtitle="Delegated"
        subValueWei={0n}
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
}: {
  groupToStake?: GroupToStake;
  addressToGroup?: Record<Address, ValidatorGroup>;
  groupToReward?: Record<Address, number>;
}) {
  const [tab, setTab] = useState<'stakes' | 'rewards' | 'delegations'>('stakes');

  return (
    <div className="pt-2">
      <div className="flex space-x-10 border-b border-taupe-300 pb-2">
        <TabHeaderButton isActive={tab === 'stakes'} onClick={() => setTab('stakes')}>
          <span className="text-sm">Stakes</span>
        </TabHeaderButton>
        <TabHeaderButton isActive={tab === 'rewards'} onClick={() => setTab('rewards')}>
          <span className="text-sm">Rewards</span>
        </TabHeaderButton>
        <TabHeaderButton isActive={tab === 'delegations'} onClick={() => setTab('delegations')}>
          <span className="text-sm">Delegations</span>
        </TabHeaderButton>
      </div>
      {tab === 'stakes' && (
        <ActiveStakesTable groupToStake={groupToStake} addressToGroup={addressToGroup} />
      )}
      {tab === 'rewards' && (
        <RewardsTable groupToReward={groupToReward} addressToGroup={addressToGroup} />
      )}
      {tab === 'delegations' && <div>TODO</div>}
    </div>
  );
}
