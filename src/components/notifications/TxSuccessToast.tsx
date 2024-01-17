import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { ChainId, chainIdToChain } from 'src/config/chains';
import { logger } from 'src/utils/logger';

export function useToastTxSuccess(
  isConfirmed?: boolean,
  txHash?: string,
  msg?: string,
  chainId: ChainId = ChainId.Celo,
) {
  useEffect(() => {
    if (!isConfirmed || !txHash) return;
    logger.debug(msg);
    toastTxSuccess(msg, txHash, chainId);
  }, [isConfirmed, txHash, msg, chainId]);
}

export function toastTxSuccess(
  txHash?: string,
  msg = 'Transaction confirmed!',
  chainId: ChainId = ChainId.Celo,
) {
  if (!txHash) return;
  const explorerUrl = chainIdToChain[chainId].explorerUrl;
  toast.success(<TxSuccessToast msg={msg} txHash={txHash} explorerUrl={explorerUrl} />, {
    autoClose: 15000,
  });
}

export function TxSuccessToast({
  msg,
  txHash,
  explorerUrl,
}: {
  msg: string;
  txHash: string;
  explorerUrl: string;
}) {
  return (
    <div>
      {msg + ' '}
      <ExternalLink className="underline" href={`${explorerUrl}/tx/${txHash}`}>
        See Details
      </ExternalLink>
    </div>
  );
}
