import { useConnectModal } from '@rainbow-me/rainbowkit';
import clsx from 'clsx';
import Link from 'next/link';
import { OutlineButton, OutlineButtonClassName } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Identicon } from 'src/components/icons/Identicon';
import { DropdownModal } from 'src/components/menus/Dropdown';
import { Amount } from 'src/components/numbers/Amount';
import AddressLabel from 'src/components/text/AddressLabel';
import { ShortAddress } from 'src/components/text/ShortAddress';
import { useGovernanceVotingPower } from 'src/features/governance/hooks/useVotingStatus';
import { useStakingRewards } from 'src/features/staking/rewards/useStakingRewards';
import { useStakingBalances } from 'src/features/staking/useStakingBalances';
import { shortenAddress } from 'src/utils/addresses';
import { useCopyHandler } from 'src/utils/clipboard';
import { logger } from 'src/utils/logger';
import { useAddressToLabel } from 'src/utils/useAddressToLabel';
import { useAccount, useDisconnect } from 'wagmi';
import { useBalance, useLockedBalance, useVoteSignerToAccount } from '../account/hooks';

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
              <AddressLabel address={address} />
            </div>
          )}
          buttonClasses={`${OutlineButtonClassName} pl-1.5 pr-3 all:py-1`}
          modal={({ close }) => (
            <DropdownContent address={address} disconnect={onDisconnect} close={close} />
          )}
          modalClasses="p-4"
        />
      ) : (
        <SolidButton className="bg-primary" onClick={openConnectModal}>
          Connect
        </SolidButton>
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
  const { signingFor, isVoteSigner } = useVoteSignerToAccount(address);
  const { balance: walletBalance } = useBalance(address);
  const { votingPower } = useGovernanceVotingPower(signingFor);
  const { lockedBalance } = useLockedBalance(signingFor);
  const { groupToStake } = useStakingBalances(signingFor);
  const { totalRewards } = useStakingRewards(signingFor, groupToStake);
  const shortAddress = shortenAddress(address, true, 10, 10);
  const { label } = useAddressToLabel(() => shortAddress)(address);

  const totalBalance = (walletBalance || 0n) + (lockedBalance || 0n);

  const onClickCopy = useCopyHandler(address);

  return (
    <div className="flex min-w-[18rem] flex-col items-center space-y-3">
      <div className="flex flex-col items-center">
        <Identicon address={address} size={34} />
        <button title="Click to copy" onClick={onClickCopy} className="flex flex-col text-sm">
          <AddressLabel address={address} hiddenIfNoLabel shortener={() => shortAddress} />
          <span className={clsx('font-mono', !!label && 'text-taupe-600')}>{shortAddress}</span>
        </button>
      </div>
      {isVoteSigner ? (
        <div className="flex flex-col items-center">
          <label className="font-italic text-sm italic">Votes on Behalf of </label>
          <span className="text-sm">
            <ShortAddress address={signingFor!} />
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <label className="text-sm"> Total Balance</label>
          <Amount valueWei={totalBalance} className="text-2xl" />
        </div>
      )}

      <div className="flex w-full flex-col justify-stretch divide-y divide-taupe-300 border border-taupe-300">
        <ValueRow
          label="Wallet Balance"
          address={isVoteSigner ? address : undefined}
          valueWei={walletBalance}
        />
        <ValueRow
          isHighlighted={isVoteSigner}
          label="Voting Power"
          address={isVoteSigner ? signingFor : undefined}
          valueWei={votingPower}
        />
        <ValueRow
          isHighlighted={isVoteSigner}
          label="Total Locked"
          address={isVoteSigner ? signingFor : undefined}
          valueWei={lockedBalance}
        />
        <ValueRow
          isHighlighted={isVoteSigner}
          label="Total Earned"
          address={isVoteSigner ? signingFor : undefined}
          value={totalRewards}
        />
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
  address,
  isHighlighted,
}: {
  isHighlighted?: boolean;
  address?: Address;
  label: string;
  value?: number;
  valueWei?: bigint;
}) {
  return (
    <div className={clsx('flex flex-col px-3 py-2.5', isHighlighted && 'bg-taupe-100')}>
      <div className="flex flex-row justify-between">
        <label className="text-sm">{label} </label>
        {address && (
          <span className="font-mono text-xs text-taupe-600">&hellip;{address?.slice(-4)}</span>
        )}
      </div>
      <Amount value={value} valueWei={valueWei} className="text-xl" />
    </div>
  );
}
