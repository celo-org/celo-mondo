import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { MergedProposalData } from 'src/features/governance/hooks/useGovernanceProposals';
import { Proposal } from 'src/features/governance/types';
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
  let quorum = new BigNumber(participationParameters.baseline).times(
    participationParameters.baselineQuorumFactor,
  );
  // https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Proposals.sol#L195-L211
  let requiredVotes = BigInt(quorum.times(propData.proposal.networkWeight.toString()).toFixed(0));

  // It would seem calculating `support` is unecessary ?
  // const totalVotes =
  //   propData.proposal.votes[VoteType.Abstain] +
  //   propData.proposal.votes[VoteType.No] +
  //   propData.proposal.votes[VoteType.Yes];

  // let noVotesWithPadding = propData.proposal.votes[VoteType.No];
  // if (requiredVotes > totalVotes) {
  //   noVotesWithPadding += requiredVotes - totalVotes;
  // }

  // const support = new BigNumber(propData.proposal.votes[VoteType.Yes].toString())
  //   .div(
  //     new BigNumber(propData.proposal.votes[VoteType.Yes].toString()).plus(
  //       noVotesWithPadding.toString(),
  //     ),
  //   )
  //   .toNumber();

  const maxThreshold = Math.max(...thresholds);
  return new BigNumber(requiredVotes.toString()).div(maxThreshold).toFixed(0);
}

function useParticipationParameters(): ParticipationParameters {
  const { data } = useReadContract({
    // blockNumber: FORK_BLOCK_NUMBER,
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

  const results = await publicClient?.multicall({
    allowFailure: false,
    // blockNumber: FORK_BLOCK_NUMBER,
    contracts: txIds.map((txId) => ({
      address: Addresses.Governance,
      // copied from governanceABI
      // which gives me a weird error:
      // Type instantiation is excessively deep and possibly infinite. ts(2589)
      abi: [
        {
          constant: true,
          inputs: [
            {
              internalType: 'uint256',
              name: 'proposalId',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'index',
              type: 'uint256',
            },
          ],
          name: 'getProposalTransaction',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: '',
              type: 'address',
            },
            {
              internalType: 'bytes',
              name: '',
              type: 'bytes',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      ] as const,
      args: [proposal.id, txId] as const,
      functionName: 'getProposalTransaction',
    })),
  });

  if (!results) {
    return;
  }

  const thresholds = await publicClient?.multicall({
    allowFailure: false,
    // blockNumber: FORK_BLOCK_NUMBER,
    contracts: results.map(([_value, destination, data]) => {
      const functionId = extractFunctionSignature(data);
      return {
        address: Addresses.Governance,
        // copied from governanceABI
        // which gives me a weird error:
        // Type instantiation is excessively deep and possibly infinite. ts(2589)
        abi: [
          {
            constant: true,
            inputs: [
              {
                internalType: 'address',
                name: 'destination',
                type: 'address',
              },
              {
                internalType: 'bytes4',
                name: 'functionId',
                type: 'bytes4',
              },
            ],
            name: 'getConstitution',
            outputs: [
              {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
        ] as const,
        functionName: 'getConstitution',
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
