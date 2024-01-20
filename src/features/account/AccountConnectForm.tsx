import { useConnectModal } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { SolidButton } from 'src/components/buttons/SolidButton';
import Avatar from 'src/images/icons/avatar.svg';

export function AccountConnectForm() {
  const { openConnectModal } = useConnectModal();

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div></div>
      <div className="flex flex-col items-center space-y-4 py-6">
        <div className="avatar placeholder">
          <div className="w-24 rounded-full bg-taupe-300 p-5">
            <Image className="opacity-80" src={Avatar} alt="Wallet" width={20} height={20} />
          </div>
        </div>
        <h2 className="font-medium">Welcome to Celo Station</h2>
        <p className="max-w-xs text-center text-sm">
          To make a transaction, you must first connect your wallet.
        </p>
      </div>
      <SolidButton onClick={openConnectModal}>Connect Wallet</SolidButton>
    </div>
  );
}
