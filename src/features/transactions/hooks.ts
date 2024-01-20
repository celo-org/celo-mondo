import { useCallback, useEffect, useState } from 'react';
import { useToastTxSuccess } from 'src/components/notifications/TxSuccessToast';
import { useToastError } from 'src/components/notifications/useToastError';
import { toTitleCase } from 'src/utils/strings';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

export function useWriteContractWithReceipt(description: string, onSuccess?: () => any) {
  const {
    data: hash,
    error: writeError,
    isError: isWriteError,
    isPending,
    writeContract,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: waitError,
    isError: isWaitError,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
    pollingInterval: 1000,
  });

  useToastError(
    writeError,
    `Error sending ${description} transaction, please check your wallet balance & settings.`,
  );
  useToastError(
    waitError,
    `Error confirming ${description} transaction, please ensure the transaction is valid.`,
  );
  useToastTxSuccess(isConfirmed, hash, `${toTitleCase(description)} transaction is confirmed!`);

  useEffect(() => {
    if (hash && isConfirmed && onSuccess) onSuccess();
  }, [hash, isConfirmed, onSuccess]);

  return {
    hash,
    isError: isWriteError || isWaitError,
    isLoading: isPending || isConfirming,
    isConfirmed,
    writeContract,
  };
}

// Some flows require multiple transactions to be sent in a specific order.
// This hook allows us to track the progress of a multi-transaction flow.
export function useTransactionPlanCounter(isTxLoading?: boolean, onPlanSuccess?: () => any) {
  const [txPlanIndex, setTxPlanIndex] = useState(0);
  const isPlanStarted = isTxLoading || txPlanIndex > 0;
  const onTxSuccess = useCallback(
    (txPlanLength: number) => {
      if (txPlanIndex >= txPlanLength - 1) {
        setTxPlanIndex(0);
        if (onPlanSuccess) onPlanSuccess();
      } else {
        setTxPlanIndex(txPlanIndex + 1);
      }
    },
    [txPlanIndex, onPlanSuccess],
  );
  return { txPlanIndex, isPlanStarted, onTxSuccess };
}
