import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useToastTxSuccess } from 'src/components/notifications/TxSuccessToast';
import { useToastError } from 'src/components/notifications/useToastError';
import { WALLET_CONNECT_CONNECTOR_ID } from 'src/config/consts';
import { logger } from 'src/utils/logger';
import { capitalizeFirstLetter } from 'src/utils/strings';
import { TransactionReceipt, encodeFunctionData } from 'viem';
import {
  Config,
  useConnection,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import type { WriteContractMutate } from 'wagmi/query';

// Special case handling for this common error to provide a more specific error message
const CHAIN_MISMATCH_ERROR = 'does not match the target chain';

// Buffer to apply on top of gas estimates to account for network fluctuations
const GAS_LIMIT_MULTIPLIER = 130n; // 1.3x

export function useWriteContractWithReceipt(
  description: string,
  onSuccess?: (receipt: TransactionReceipt) => any,
  showTxSuccessToast = false,
) {
  const account = useConnection();
  const publicClient = usePublicClient();

  const {
    data: hash,
    error: writeError,
    isError: isWriteError,
    isPending,
    mutate: writeContract,
  } = useWriteContract();

  // Gas estimation and request preparation run before the wallet mutation reports pending,
  // so track them here or a button can fire the same transaction twice. The ref closes the
  // window before the loading state has re-rendered.
  const [isPreparing, setIsPreparing] = useState(false);
  const inFlight = useRef(false);
  const writeContractWithTxPrep = useCallback(
    async (args: Parameters<WriteContractMutate<Config, unknown>>[0]) => {
      if (!publicClient) {
        logger.error('Public client not ready for tx');
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;
      setIsPreparing(true);
      try {
        const encodedData = encodeFunctionData(args);
        let gas: bigint;
        let fees: { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint; gasPrice?: bigint } = {};
        try {
          logger.debug('Estimating gas for transaction');
          const estimatedGas = await publicClient.estimateGas({
            to: args.address,
            data: encodedData,
            value: args.value,
            account: account.address,
          });
          gas = (estimatedGas * GAS_LIMIT_MULTIPLIER) / 100n;

          // Some WalletConnect-ed wallets like Celo Terminal require that the tx be fully populated
          if (account?.connector?.id === WALLET_CONNECT_CONNECTOR_ID) {
            logger.debug('Preparing transaction request for WalletConnect wallet');
            const request = await publicClient.prepareTransactionRequest({
              to: args.address,
              chainId: args.chainId,
              value: args.value,
              data: encodedData,
              account: account.address,
            });
            fees =
              request.maxFeePerGas != null
                ? {
                    maxFeePerGas: request.maxFeePerGas,
                    maxPriorityFeePerGas: request.maxPriorityFeePerGas,
                  }
                : { gasPrice: request.gasPrice };
          }
        } catch (error) {
          // A failed estimate means the call would revert; without this the rejection
          // escapes the click handler and the user sees nothing
          logger.error(`Error preparing ${description} transaction`, error);
          toast.error(`Error preparing ${description} transaction, it would fail on-chain.`);
          return;
        }
        logger.debug('Trigger transaction write');
        writeContract({ ...args, gas, ...fees } as any);
      } finally {
        inFlight.current = false;
        setIsPreparing(false);
      }
    },
    [writeContract, publicClient, account, description],
  );

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: waitError,
    isError: isWaitError,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
    pollingInterval: 1000,
  });

  useToastError(
    writeError,
    writeError?.message?.includes(CHAIN_MISMATCH_ERROR)
      ? 'Your wallet is not connected to Celo, please switch your active chain'
      : `Error sending ${description} transaction, please check your wallet balance & settings.`,
  );
  useToastError(
    waitError,
    `Error confirming ${description} transaction, please ensure the transaction is valid.`,
  );
  useToastTxSuccess({
    isConfirmed,
    txHash: hash,
    message: `${capitalizeFirstLetter(description)} transaction is confirmed!`,
    enabled: showTxSuccessToast,
  });

  // Run onSuccess when tx is confirmed
  // Some extra state is needed to ensure this only runs once per tx
  const [hasRunOnSuccess, setHasRunOnSuccess] = useState(false);
  useEffect(() => {
    if (hash && receipt && isConfirmed && !hasRunOnSuccess && onSuccess) {
      setHasRunOnSuccess(true);
      onSuccess(receipt);
    }
  }, [hash, receipt, isConfirmed, hasRunOnSuccess, onSuccess]);
  useEffect(() => {
    if (!hash || !receipt || !isConfirmed) setHasRunOnSuccess(false);
  }, [hash, receipt, isConfirmed]);

  return {
    hash,
    isError: isWriteError || isWaitError,
    isLoading: isPreparing || isPending || isConfirming,
    isConfirmed,
    writeContract: writeContractWithTxPrep,
  };
}
