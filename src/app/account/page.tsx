'use client';

import Image from 'next/image';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Section } from 'src/components/layout/Section';
import { Amount } from 'src/components/numbers/Amount';
import { useBalance, useLockedBalance } from 'src/features/account/hooks';
import { useStakingRewards } from 'src/features/staking/rewards/useStakingRewards';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
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
  const { lockedBalance } = useLockedBalance(address);
  const { groupToStake } = useStakingBalances(address);
  const { totalRewards: _totalRewards } = useStakingRewards(address, groupToStake);

  const totalBalance = (walletBalance || 0n) + (lockedBalance || 0n);

  return (
    <Section className="mt-6" containerClassName="space-y-8 min-w-[40rem]">
      <h1 className="font-serif text-3xl">Dashboard</h1>
      <div className="flex items-center justify-between">
        <div>
          <h2>Total Balance</h2>
          <Amount valueWei={totalBalance} className="mt-2 text-4xl" />
        </div>
        <div className="flex space-x-2">
          <SolidButton>
            <div className="flex items-center space-x-1.5">
              <Image src={Lock} width={12} height={12} alt="" />
              <span>Lock</span>
            </div>
          </SolidButton>
          <SolidButton>
            <div className="flex items-center space-x-1.5">
              <Image src={Unlock} width={12} height={12} alt="" />
              <span>Unlock</span>
            </div>
          </SolidButton>
          <SolidButton>
            <div className="flex items-center space-x-1.5">
              <Image src={Withdraw} width={12} height={12} alt="" />
              <span>Withdraw</span>
            </div>
          </SolidButton>
        </div>
      </div>
    </Section>
  );
}
