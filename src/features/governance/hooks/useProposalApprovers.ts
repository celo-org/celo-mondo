import { governanceABI, multiSigABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { Address, PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

type ApprovalConfirmation = {
  approver: string;
  multisigTxId: number;
  confirmedAt: number;
  blockNumber: number;
  transactionHash: string;
};

type ApprovalConfirmationsResponse = {
  proposalId: number;
  approvals: ApprovalConfirmation[];
  count: number;
};

// @returns addresses of approvers that have confirmed the proposal
export function useProposalApprovers(proposalId: number) {
  const {
    data: approversMultisigAddress,
    isLoading: isApproversMultisigAddressLoading,
    isError: isApproversMultisigAddressError,
  } = useGovernanceApproverMultiSigAddress();

  const {
    data: confirmationsData,
    isLoading: isConfirmationsLoading,
    isError: isConfirmationsError,
  } = useQuery({
    queryKey: ['ProposalApprovalConfirmations', proposalId],
    queryFn: () => fetchProposalApprovalConfirmations(proposalId),
    staleTime: StaleTime.Default,
  });

  const {
    data: requiredConfirmationsCount,
    isLoading: isRequiredCountLoading,
    isError: isRequiredCountError,
  } = useRequiredApproversCount(approversMultisigAddress);

  return {
    isLoading:
      isConfirmationsLoading || isApproversMultisigAddressLoading || isRequiredCountLoading,
    isError: isConfirmationsError || isApproversMultisigAddressError || isRequiredCountError,
    confirmedBy: (confirmationsData?.approvals.map((a) => a.approver as Address) ||
      []) as Address[],
    confirmations: confirmationsData?.approvals || [],
    requiredConfirmationsCount,
  };
}

function useGovernanceApproverMultiSigAddress() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['GovernanceApproverMultiSigAddress', publicClient],
    queryFn: () => fetchApproverMultiSigAddress(publicClient!),
    enabled: !!publicClient,
    staleTime: StaleTime.Default,
  });
}

function useRequiredApproversCount(approversMultisigAddress: Address | undefined) {
  const publicClient = usePublicClient();
  return useQuery({
    queryKey: ['GovernanceRequiredConfirmationsCount', publicClient, approversMultisigAddress],
    queryFn: () => fetchRequiredConfirmationsCount(publicClient!, approversMultisigAddress!),
    enabled: !!publicClient && !!approversMultisigAddress,
    staleTime: StaleTime.Default,
  });
}

/*
 * Fetches approval confirmations from the database via API
 * @returns approval confirmations for the proposal
 */
async function fetchProposalApprovalConfirmations(
  proposalId: number,
): Promise<ApprovalConfirmationsResponse> {
  const response = await fetch(`/api/governance/${proposalId}/approval-confirmations`);

  if (!response.ok) {
    throw new Error(`Failed to fetch approval confirmations: ${response.statusText}`);
  }

  return response.json();
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
