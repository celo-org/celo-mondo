import { useConnectModal } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Identicon } from 'src/components/icons/Identicon';
import { Dropdown } from 'src/components/menus/Dropdown';
import { Amount } from 'src/components/numbers/Amount';
import { useStakingRewards } from 'src/features/staking/rewards/useStakingRewards';
import { shortenAddress } from 'src/utils/addresses';
import { tryClipboardSet } from 'src/utils/clipboard';
import { useAccount, useDisconnect } from 'wagmi';
import { useBalance, useLockedBalance } from '../account/hooks';

export function WalletDropdown() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();

  return (
    <div className="relative mb-1 flex justify-end">
      {address && isConnected ? (
        <Dropdown
          button={
            <OutlineButton className="pl-1.5 pr-3 all:py-1">
              <div className="flex items-center justify-center space-x-1">
                <Identicon address={address} size={26} />
                <div className="text-sm">{shortenAddress(address, true)}</div>
              </div>
            </OutlineButton>
          }
          content={<DropdownContent address={address} disconnect={disconnect} />}
          className="dropdown-end"
        />
      ) : (
        <SolidButton onClick={openConnectModal}>Connect</SolidButton>
      )}
    </div>
  );
}

function DropdownContent({ address, disconnect }: { address: Address; disconnect: () => void }) {
  const { balance: walletBalance } = useBalance(address);
  const { balance: lockedBalance } = useLockedBalance(address);
  // TODO need to provide useStakingRewards with groupvotes here
  const { totalRewards } = useStakingRewards(address);

  const totalBalance = (walletBalance?.value || 0n) + (lockedBalance?.value || 0n);

  const onClickCopy = async () => {
    if (!address) return;
    await tryClipboardSet(address);
    toast.success('Address copied to clipboard', { autoClose: 1200 });
  };

  return (
    <div className="flex min-w-[18rem] flex-col items-center space-y-3">
      <div className="flex flex-col items-center">
        <Identicon address={address} size={34} />
        <button title="Click to copy" onClick={onClickCopy} className="text-sm">
          {shortenAddress(address)}
        </button>
      </div>
      <div className="flex flex-col items-center">
        <label className="text-sm">Total Balance</label>
        <Amount valueWei={totalBalance} className="text-2xl" />
      </div>
      <div className="flex w-full flex-col justify-stretch divide-y divide-taupe-300 border border-taupe-300">
        <ValueRow label="Wallet Balance" valueWei={walletBalance?.value} />
        <ValueRow label="Total Locked" valueWei={lockedBalance?.value} />
        <ValueRow label="Total Earned" valueWei={totalRewards} />
      </div>
      <div className="flex w-full items-center justify-between space-x-4">
        <Link href="/account">
          <OutlineButton>My Account</OutlineButton>
        </Link>
        <OutlineButton onClick={disconnect}>Disconnect</OutlineButton>
      </div>
    </div>
  );
}

function ValueRow({ label, valueWei }: { label: string; valueWei?: string | number | bigint }) {
  return (
    <div className="flex flex-col px-3 py-2.5">
      <label className="text-sm">{label}</label>
      <Amount valueWei={valueWei} className="text-xl" />
    </div>
  );
}
