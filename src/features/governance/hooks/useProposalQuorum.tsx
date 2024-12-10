import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { MergedProposalData } from 'src/features/governance/hooks/useGovernanceProposals';
import { Proposal } from 'src/features/governance/types';
import { FORK_BLOCK_NUMBER } from 'src/test/anvil/constants';
import { fromFixidity } from 'src/utils/numbers';
import { PublicClient } from 'viem';
import { usePublicClient, useReadContract } from 'wagmi';

interface ParticipationParameters {
  baseline: number;
  baselineFloor: number;
  baselineUpdateFactor: number;
  baselineQuorumFactor: number;
}

export function useProposalQuorum(propData?: MergedProposalData) {
  const participationParameters = useParticipationParameters();
  const thresholds = useThresholds(propData?.proposal);

  if (!propData || !propData.proposal) return;
  if (!thresholds || !participationParameters) return;

  // https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Governance.sol#L1567
  const quorumPct = new BigNumber(participationParameters.baseline).times(
    participationParameters.baselineQuorumFactor,
  );
  // https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Proposals.sol#L195-L211
  const quorumVotes = BigInt(
    quorumPct.times(propData.proposal.networkWeight.toString()).toFixed(0),
  );
  const maxThreshold = Math.max(...thresholds);
  return new BigNumber(quorumVotes.toString()).times(maxThreshold).toFixed(0);
}

function useParticipationParameters(): ParticipationParameters {
  const { data } = useReadContract({
    blockNumber: process.env.NODE_ENV === 'development' ? FORK_BLOCK_NUMBER : undefined,
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getParticipationParameters',
    query: {
      gcTime: Infinity,
      staleTime: 60 * 60 * 1000, // 1 hour
    },
  });

  return useMemo(
    () => ({
      baseline: fromFixidity(data?.[0]),
      baselineFloor: fromFixidity(data?.[1]),
      baselineUpdateFactor: fromFixidity(data?.[2]),
      baselineQuorumFactor: fromFixidity(data?.[3]),
    }),
    [data],
  );
}

function useThresholds(proposal?: Proposal) {
  const publicClient = usePublicClient();
  const { isLoading, error, data } = useQuery({
    queryKey: ['useThresholds', publicClient],
    queryFn: async () => {
      if (!publicClient || !proposal) return null;
      return await fetchThresholds(publicClient, proposal);
    },
  });
  useToastError(error, 'Error fetching proposal quorum data');

  return isLoading ? undefined : data;
}

async function fetchThresholds(publicClient: PublicClient, proposal: Proposal) {
  const txIds = new Array(Number(proposal.numTransactions)).fill(0).map((_, id) => id);

  // Extracting the base contract call avoids the following error:
  // Type instantiation is excessively deep and possibly infinite. ts(2589)
  const getProposalTransactionContract = {
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getProposalTransaction',
  } as const;

  const results = await publicClient?.multicall({
    allowFailure: false,
    blockNumber: process.env.NODE_ENV === 'development' ? FORK_BLOCK_NUMBER : undefined,
    contracts: txIds.map((txId: number) => ({
      ...getProposalTransactionContract,
      args: [proposal.id, txId],
    })),
  });

  if (!results) {
    return;
  }

  // Extracting the base contract call avoids the following error:
  // Type instantiation is excessively deep and possibly infinite. ts(2589)
  const getConstitutionContract = {
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getConstitution',
  } as const;

  const thresholds = await publicClient?.multicall({
    allowFailure: false,
    blockNumber: process.env.NODE_ENV === 'development' ? FORK_BLOCK_NUMBER : undefined,
    contracts: results.map(([_value, destination, data]) => {
      const functionId = extractFunctionSignature(data);
      return {
        ...getConstitutionContract,
        args: [destination, functionId],
      };
    }),
  });

  if (!thresholds) {
    return;
  }

  // https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Governance.sol#L1580-L1583
  return thresholds.map(fromFixidity);
}

/**
 *
 * @notice Extracts the first four bytes of a byte array.
 * https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/common/ExtractFunctionSignature.sol#L9
 */
function extractFunctionSignature(input: `0x${string}`): `0x${string}` {
  const data = Buffer.from(input.replace('0x', ''), 'hex');
  return `0x${data.subarray(0, 4).toString('hex')}`;
}
