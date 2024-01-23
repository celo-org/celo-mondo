import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { ChainId } from 'src/config/chains';
import { getTxExplorerUrl } from 'src/features/transactions/utils';
import { logger } from 'src/utils/logger';

export function useToastTxSuccess({
  isConfirmed,
  txHash,
  message = 'Transaction confirmed!',
  chainId = ChainId.Celo,
  enabled = true,
}: {
  isConfirmed?: boolean;
  txHash?: string;
  message?: string;
  chainId?: ChainId;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!isConfirmed || !txHash || !enabled) return;
    logger.debug(message);
    const explorerUrl = getTxExplorerUrl(txHash, chainId);
    toast.success(<TxSuccessToast message={message} explorerUrl={explorerUrl} />, {
      autoClose: 15000,
    });
  }, [isConfirmed, txHash, message, chainId, enabled]);
}

function TxSuccessToast({ message, explorerUrl }: { message: string; explorerUrl: string }) {
  return (
    <div>
      {message + ' '}
      <ExternalLink className="underline" href={explorerUrl}>
        See Details
      </ExternalLink>
    </div>
  );
}
