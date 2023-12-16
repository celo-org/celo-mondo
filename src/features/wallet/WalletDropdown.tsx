import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from 'react-toastify';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Dropdown } from 'src/components/menus/Dropdown';
import { shortenAddress } from 'src/utils/addresses';
import { tryClipboardSet } from 'src/utils/clipboard';
import { useAccount, useDisconnect } from 'wagmi';

export function WalletDropdown() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  console.log('dis', disconnect);

  const onClickCopy = async () => {
    if (!address) return;
    await tryClipboardSet(address);
    toast.success('Address copied to clipboard', { autoClose: 1200 });
  };

  return (
    <div className="relative mb-1 flex justify-end opacity-90">
      {address && isConnected ? (
        <Dropdown
          button={<SolidButton>{shortenAddress(address)}</SolidButton>}
          content={'FOObar'}
          className="dropdown-end"
        />
      ) : (
        <SolidButton onClick={openConnectModal}>Connect</SolidButton>
      )}
    </div>
  );
}
