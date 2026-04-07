import Image from 'next/image';
import { useBalance } from 'src/features/account/hooks';
import InfoIcon from 'src/images/icons/info-circle.svg';
import { useIsMiniPay } from 'src/utils/useIsMiniPay';
import { useAccount } from 'wagmi';

export function MiniPayNoCeloBanner() {
  const isMiniPay = useIsMiniPay();
  const { address } = useAccount();
  const { balance, isLoading, isError } = useBalance(isMiniPay ? address : undefined);

  if (!isMiniPay || !address || isLoading || isError || balance > 0n) return null;

  return (
    <div className="flex items-center gap-2 bg-yellow-500/50 px-4 py-2.5 text-sm">
      <Image src={InfoIcon} width={16} height={16} alt="info" />
      <span>
        You have no CELO. <strong>You need CELO to use this app</strong> — get CELO first before
        continuing.
      </span>
    </div>
  );
}
