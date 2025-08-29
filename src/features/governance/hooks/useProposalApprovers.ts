import { governanceABI, multiSigABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useProposalDequeueIndex } from 'src/features/governance/hooks/useProposalQueue';
import { PublicClient, encodeFunctionData } from 'viem';
import { usePublicClient } from 'wagmi';

// @returns addresses of approvers that have confirmed the proposal
export function useProposalApprovers(proposalId: number) {
  const publicClient = usePublicClient();

  const {
    data: approversMultisigAddress,
    isSuccess: isApproversMultisigAddressSuccess,
    isLoading: isApproversMultisigAddressLoading,
    isError: isApproversMultisigAddressError,
  } = useGovernanceApproverMultiSigAddress();

  const {
    index: dequeueIndex,
    isLoading: isIndexLoading,
    isError: isDequeueIndexError,
  } = useProposalDequeueIndex(proposalId);

  const {
    data: confirmations,
    isLoading: isConfirmationsLoading,
    isError: isConfirmationsError,
  } = useQuery({
    queryKey: [
      'ProposalApprovers',
      publicClient,
      approversMultisigAddress,
      proposalId,
      dequeueIndex,
    ],
    queryFn: () =>
      fetchProposalApprovers(publicClient!, {
        governanceApproverMultisigAddress: approversMultisigAddress!,
        proposalId: BigInt(proposalId),
        dequeueIndex: dequeueIndex!,
      }),
    enabled: isApproversMultisigAddressSuccess && dequeueIndex !== undefined,
    staleTime: StaleTime.Default,
  });

  const {
    data: requiredConfirmationsCount,
    isLoading: isRequiredCountLoading,
    isError: isRequiredCountError,
  } = useRequiredApproversCount(approversMultisigAddress);

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

function useGovernanceApproverMultiSigAddress() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['GovernanceApproverMultiSigAddress', publicClient],
    queryFn: () => fetchApproverMultiSigAddress(publicClient!),
    enabled: !!publicClient,
    staleTime: StaleTime.Long,
  });
}

function useRequiredApproversCount(approversMultisigAddress: Address | undefined) {
  const publicClient = usePublicClient();
  return useQuery({
    queryKey: ['GovernanceRequiredConfirmationsCount', publicClient, approversMultisigAddress],
    queryFn: () => fetchRequiredConfirmationsCount(publicClient!, approversMultisigAddress!),
    enabled: !!publicClient && !!approversMultisigAddress,
    staleTime: StaleTime.Long,
  });
}

type ParamsFetchApproversInfo = {
  governanceApproverMultisigAddress: Address;
  proposalId: bigint;
  dequeueIndex: bigint;
};

/*
 * @returns addresses of approvers that have confirmed the proposal
 */
async function fetchProposalApprovers(
  publicClient: PublicClient,
  { proposalId, dequeueIndex, governanceApproverMultisigAddress }: ParamsFetchApproversInfo,
) {
  // first need to find transaction in multisig that corresponds to the proposal
  const txIndexInMultisig = await fetchIndexOfTransactionForProposalInMultisig(publicClient, {
    governanceApproverMultisigAddress,
    proposalId,
    dequeueIndex,
  });

  if (txIndexInMultisig === -1) {
    return [];
  }

  const confirmations = await publicClient.readContract({
    address: governanceApproverMultisigAddress,
    abi: multiSigABI,
    functionName: 'getConfirmations',
    args: [BigInt(txIndexInMultisig)],
  });
  return confirmations;
}

/*
 * @param proposalId - id of the proposal
 * @param dequeueIndex - index of the proposal in the queue
 * @param governanceApproverMultisigAddress - address of the multisig that holds the approvers
 * @returns index of transaction in multisig that corresponds to the proposal
 */
async function fetchIndexOfTransactionForProposalInMultisig(
  publicClient: PublicClient,
  { proposalId, dequeueIndex, governanceApproverMultisigAddress }: ParamsFetchApproversInfo,
) {
  // sadly the Multisig gives no other way to fetch a specific transaction other than already
  // knowing the index or iterating through all transactions and matching the calldata

  const countOfMultisigTransactions = await publicClient.readContract({
    address: governanceApproverMultisigAddress,
    abi: multiSigABI,
    functionName: 'getTransactionCount',
    args: [true, true],
  });

  const allTransactionsInMultisig = await publicClient.multicall({
    contracts: Array(Number(countOfMultisigTransactions ?? 0))
      .fill(0)
      .map((_, i) => ({
        address: governanceApproverMultisigAddress,
        abi: multiSigABI,
        functionName: 'transactions',
        args: [BigInt(i)],
      })),
  });

  const approveTxData = encodeFunctionData({
    abi: governanceABI,
    functionName: 'approve',
    args: [proposalId, dequeueIndex],
  });

  const indexOfTxToFindApproversOf = allTransactionsInMultisig.findIndex((query) => {
    if (query.status === 'success') {
      const [_destination, _value, data] = query.result as [string, bigint, string, boolean];
      return data === approveTxData;
    }
    return false;
  });
  return indexOfTxToFindApproversOf;
}

async function fetchRequiredConfirmationsCount(
  publicClient: PublicClient,
  approversMultisigAddress: Address,
) {
  const result = await publicClient.readContract({
    address: approversMultisigAddress,
    abi: multiSigABI,
    functionName: 'required',
    args: [],
  });
  return result;
}

async function fetchApproverMultiSigAddress(publicClient: PublicClient) {
  const result = await publicClient.readContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'approver',
    args: [],
  });
  return result;
}
