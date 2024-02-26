import { governanceABI } from '@celo/abis';
import { Addresses } from 'src/config/contracts';
import { OrderedVoteValue, VoteFormValues } from 'src/features/governance/types';
import { TxPlan } from 'src/features/transactions/types';
import { logger } from 'src/utils/logger';

// Lock token operations can require varying numbers of txs in specific order
// This determines the ideal tx types and order
export function getVoteTxPlan(values: VoteFormValues, dequeued: number[]): TxPlan {
  const { proposalId, vote } = values;
  const proposalIndex = dequeued.indexOf(proposalId);
  const voteInt = OrderedVoteValue.indexOf(vote);

  if (proposalIndex < 0) {
    logger.error(`No proposal index found for: ${proposalId}`);
    return [];
  }

  return [
    {
      action: 'vote',
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'vote',
      args: [proposalId, proposalIndex, voteInt],
    },
  ];
}
