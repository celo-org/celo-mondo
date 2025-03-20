import { governanceABI, multiSigABI } from '@celo/abis-12';
import { useMemo } from 'react';
import { StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useProposalDequeueIndex } from 'src/features/governance/hooks/useProposalQueue';
import { encodeFunctionData } from 'viem';
import { useReadContract, useReadContracts } from 'wagmi';

// @returns addresses of approvers that have confirmed the proposal
export function useProposalApprovers(proposalId: number) {
  const {
    data: approversMultisigAddress,
    isSuccess: isApproversMultisigAddressSuccess,
    isLoading: isApproversMultisigAddressLoading,
    isError: isApproversMultisigAddressError,
  } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'approver',
    args: [],
    query: {
      enabled: proposalId !== undefined,
      staleTime: StaleTime.Long,
    },
  });

  const { data: numberOfTxInMultiSig, isSuccess: isNumberOfTxInMultiSigSuccess } = useReadContract({
    address: approversMultisigAddress,
    abi: multiSigABI,
    functionName: 'getTransactionCount',
    args: [true, true],
    query: {
      enabled: isApproversMultisigAddressSuccess,
      staleTime: StaleTime.Long,
    },
  });

  const { data: allTransactionsInMultisig } = useReadContracts({
    contracts: Array(Number(numberOfTxInMultiSig ?? 0))
      .fill(0)
      .map((_, i) => ({
        address: approversMultisigAddress,
        abi: multiSigABI,
        functionName: 'transactions',
        args: [i],
      })),
    query: {
      enabled: isApproversMultisigAddressSuccess && isNumberOfTxInMultiSigSuccess,
      staleTime: StaleTime.Long,
    },
  });

  const {
    index: dequeueIndex,
    isLoading: isIndexLoading,
    isError: isDequeueIndexError,
  } = useProposalDequeueIndex(proposalId);

  const indexOfTXToFindApproversOf = useMemo(() => {
    if (!allTransactionsInMultisig || !proposalId || !dequeueIndex) return -1;

    const approveTxData = encodeFunctionData({
      abi: governanceABI,
      functionName: 'approve',
      args: [BigInt(proposalId), dequeueIndex],
    });

    return allTransactionsInMultisig.findIndex((query) => {
      if (query.status === 'success' && query.result) {
        const [_destination, _value, data] = query.result as [string, bigint, string, boolean];
        return data === approveTxData;
      }
      return false;
    });
  }, [dequeueIndex, allTransactionsInMultisig, proposalId]);

  const {
    data: confirmations,
    isLoading: isConfirmationsLoading,
    isError: isConfirmationsError,
  } = useReadContract({
    address: approversMultisigAddress,
    abi: multiSigABI,
    functionName: 'getConfirmations',
    args: [indexOfTXToFindApproversOf !== -1 ? BigInt(indexOfTXToFindApproversOf) : 0n],
    query: {
      enabled: isApproversMultisigAddressSuccess && indexOfTXToFindApproversOf !== -1,
      staleTime: StaleTime.Default,
    },
  });

  const {
    data: requiredConfirmationsCount,
    isLoading: isRequiredCountLoading,
    isError: isRequiredCountError,
  } = useReadContract({
    address: approversMultisigAddress,
    abi: multiSigABI,
    functionName: 'required',
    args: [],
    query: {
      enabled: isApproversMultisigAddressSuccess,
      staleTime: StaleTime.Long,
    },
  });

  return {
    isLoading:
      isConfirmationsLoading ||
      isIndexLoading ||
      isApproversMultisigAddressLoading ||
      isRequiredCountLoading,
    isError:
      isConfirmationsError ||
      isDequeueIndexError ||
      isApproversMultisigAddressError ||
      isRequiredCountError,
    confirmedBy: confirmations,
    requiredConfirmationsCount,
  };
}
