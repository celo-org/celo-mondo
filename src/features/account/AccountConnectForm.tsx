import { useConnectModal } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { SolidButton } from 'src/components/buttons/SolidButton';
import CeloCube from 'src/images/logos/celo-cube.webp';

export function AccountConnectForm() {
  const { openConnectModal } = useConnectModal();

  return (
    <div>
      <div className="flex flex-col items-center space-y-4 py-16">
        <div className="bounce-and-spin flex items-center justify-center">
          <Image className="" src={CeloCube} alt="Loading..." width={80} height={80} />
        </div>
        <h2>Welcome to Celo Station</h2>
        <p>To make a transaction, you must first connect your wallet.</p>
      </div>
      <SolidButton onClick={openConnectModal}>Connect Wallet</SolidButton>
    </div>
  );
}
