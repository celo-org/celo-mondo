import { useToastTxSuccess } from 'src/components/notifications/TxSuccessToast';
import { useToastError } from 'src/components/notifications/useToastError';
import { toTitleCase } from 'src/utils/strings';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

export function useWriteContractWithReceipt(description: string) {
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
  });

  useToastError(
    writeError,
    `Error sending ${description} transaction, please check your wallet balance/settings and try again.`,
  );
  useToastError(
    waitError,
    `Error confirming ${description} transaction, please ensure the transaction is valid.`,
  );
  useToastTxSuccess(isConfirmed, `${toTitleCase(description)} transaction is confirmed!`);

  return {
    hash,
    isError: isWriteError || isWaitError,
    isLoading: isPending || isConfirming,
    isConfirmed,
    writeContract,
  };
}
