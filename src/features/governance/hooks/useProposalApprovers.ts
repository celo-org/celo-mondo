import { governanceABI, multiSigABI } from '@celo/abis-12';
import { StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useProposalDequeueIndex } from 'src/features/governance/hooks/useProposalQueue';
import { encodeFunctionData } from 'viem';
import { useReadContract, useReadContracts } from 'wagmi';

export function useProposalApprovers(proposalId: number) {
  // get the address of the approver contract (a multisig contract)
  const approverAddress = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'approver',
    args: [],
    query: {
      enabled: proposalId !== undefined,
      staleTime: StaleTime.Long,
    },
  });
  const { index, isLoading: isIndexLoading } = useProposalDequeueIndex(proposalId);
  // build an approval txn which is needed to find the number above approvals

  const approveTxData =
    index &&
    index !== -1n &&
    encodeFunctionData({
      abi: governanceABI,
      functionName: 'approve',
      args: [BigInt(proposalId), index],
    });

  // getConfirmations might be more accuratly get addresses of owners who have approved
  const numberOfTxInMultiSig = useReadContract({
    address: approverAddress.data,
    abi: multiSigABI,
    functionName: 'getTransactionCount',
    // pending, executed
    args: [true, true], //todo need to find the correct index which is different from the dequeue index
    query: {
      enabled: approverAddress.isSuccess,
      staleTime: StaleTime.Long,
    },
  });

  const allTransactionsInMultisig = useReadContracts({
    contracts: Array(Number(numberOfTxInMultiSig.data ?? 0))
      .fill(0)
      .map((_, i) => ({
        address: approverAddress.data,
        abi: multiSigABI,
        functionName: 'transactions',
        args: [i], //todo need to find the correct index which is different from the dequeue index
      })),
    query: {
      enabled: approverAddress.isSuccess && numberOfTxInMultiSig.isSuccess,
      staleTime: StaleTime.Long,
    },
  });
  const indexOfTXToFindApproversOF = allTransactionsInMultisig.data?.findIndex((query) => {
    if (query.status === 'success' && query.result) {
      const [_destination, _value, data, _isExecuted] = query.result as [
        string,
        bigint,
        string,
        boolean,
      ];
      return data === approveTxData;
    }
  });

  const confirmations = useReadContract({
    address: approverAddress.data,
    abi: multiSigABI,
    functionName: 'getConfirmations',
    args: [indexOfTXToFindApproversOF !== -1 ? BigInt(indexOfTXToFindApproversOF ?? 0) : 0n],
    query: {
      enabled:
        approverAddress.isSuccess &&
        indexOfTXToFindApproversOF !== undefined &&
        indexOfTXToFindApproversOF !== -1,
      staleTime: StaleTime.Long,
    },
  });

  const requiredConfirmationsCount = useReadContract({
    address: approverAddress.data,
    abi: multiSigABI,
    functionName: 'required',
    args: [],
    query: {
      enabled: approverAddress.isSuccess,
      staleTime: StaleTime.Long,
    },
  });

  return {
    isLoading: confirmations.isLoading || isIndexLoading || approverAddress.isLoading,
    isError: confirmations.isError || approverAddress.isError,
    confirmedBy: confirmations.data,
    requiredConfirmationsCount: requiredConfirmationsCount.data,
  };
}
