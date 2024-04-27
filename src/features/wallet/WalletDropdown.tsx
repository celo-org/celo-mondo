import { useConnectModal } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { OutlineButton, OutlineButtonClassName } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Identicon } from 'src/components/icons/Identicon';
import { DropdownModal } from 'src/components/menus/Dropdown';
import { Amount } from 'src/components/numbers/Amount';
import { useStakingRewards } from 'src/features/staking/rewards/useStakingRewards';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { shortenAddress } from 'src/utils/addresses';
import { useCopyHandler } from 'src/utils/clipboard';
import { logger } from 'src/utils/logger';
import { useAccount, useDisconnect } from 'wagmi';
import { useBalance, useLockedBalance } from '../account/hooks';

export function WalletDropdown() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnectAsync } = useDisconnect();

  const onDisconnect = async () => {
    try {
      await disconnectAsync();
    } catch (err) {
      logger.error('Error disconnecting wallet', err);
      // Sometimes a page reload helps handle disconnection issues
      window.location.reload();
    }
  };

  return (
    <div className="relative flex justify-end">
      {address && isConnected ? (
        <DropdownModal
          button={() => (
            <div className="flex items-center justify-center space-x-1">
              <Identicon address={address} size={26} />
              <div className="text-sm">{shortenAddress(address, true)}</div>
            </div>
          )}
          buttonClasses={`${OutlineButtonClassName} pl-1.5 pr-3 all:py-1`}
          modal={({ close }) => (
            <DropdownContent address={address} disconnect={onDisconnect} close={close} />
          )}
          modalClasses="p-4"
        />
      ) : (
        <SolidButton onClick={openConnectModal}>Connect</SolidButton>
      )}
    </div>
  );
}

function DropdownContent({
  address,
  disconnect,
  close,
}: {
  address: Address;
  disconnect: () => any;
  close: () => void;
}) {
  const { balance: walletBalance } = useBalance(address);
  const { lockedBalance } = useLockedBalance(address);
  const { groupToStake } = useStakingBalances(address);
  const { totalRewards } = useStakingRewards(address, groupToStake);

  const totalBalance = (walletBalance || 0n) + (lockedBalance || 0n);

  const onClickCopy = useCopyHandler(address);

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
        <ValueRow label="Wallet Balance" valueWei={walletBalance} />
        <ValueRow label="Total Locked" valueWei={lockedBalance} />
        <ValueRow label="Total Earned" value={totalRewards} />
      </div>
      <div className="flex w-full items-center justify-between space-x-4">
        <Link href="/account">
          <OutlineButton onClick={close}>My Account</OutlineButton>
        </Link>
        <OutlineButton onClick={disconnect}>Disconnect</OutlineButton>
      </div>
    </div>
  );
}

function ValueRow({
  label,
  value,
  valueWei,
}: {
  label: string;
  value?: number;
  valueWei?: bigint;
}) {
  return (
    <div className="flex flex-col px-3 py-2.5">
      <label className="text-sm">{label}</label>
      <Amount value={value} valueWei={valueWei} className="text-xl" />
    </div>
  );
}
