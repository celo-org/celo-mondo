import { governanceABI } from '@celo/abis';
import { Event, fetchProposalEvents } from 'src/app/governance/events';
import { EmptyVoteAmounts, VoteAmounts, VoteType } from 'src/features/governance/types';
import { isValidAddress } from 'src/utils/addresses';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { bigIntSum } from 'src/utils/math';
import { objFilter } from 'src/utils/objects';
import { decodeEventLog } from 'viem';

export async function fetchProposalVoters(id: number): Promise<{
  voters: AddressTo<VoteAmounts>;
  totals: VoteAmounts;
}> {
  const castVoteEvents = await fetchProposalEvents(celoPublicClient.chain.id, 'ProposalVoted', {
    proposalId: BigInt(id),
  });

  const voterToVotes: AddressTo<VoteAmounts> = {};
  reduceLogs(voterToVotes, castVoteEvents, true);

  // Skipping revoke vote events for now for performance since they are almost never used
  // Much more common is for a voter to re-vote, replacing the old vote
  // const revokeVoteParams = `topic0=${revokeVoteTopics[0]}&topic1=${revokeVoteTopics[1]}&topic0_1_opr=and`;
  // const revokeVoteEvents = await queryCeloscanLogs(Addresses.Governance, revokeVoteParams);
  // reduceLogs(voterToVotes, revokeVoteEvents, false);

  // Filter out voters with no current votes
  const voters = objFilter(
    voterToVotes,
    (_, votes): votes is VoteAmounts => bigIntSum(Object.values(votes)) > 0n,
  );

  const totals = Object.values(voters).reduce<VoteAmounts>(
    (acc, votes) => {
      acc[VoteType.Yes] += votes[VoteType.Yes];
      acc[VoteType.No] += votes[VoteType.No];
      acc[VoteType.Abstain] += votes[VoteType.Abstain];
      return acc;
    },
    { ...EmptyVoteAmounts },
  );

  return { voters, totals };
}

function reduceLogs(voterToVotes: AddressTo<VoteAmounts>, logs: Event[], isCast: boolean) {
  for (const log of logs) {
    const decoded = decodeVoteEventLog(log);
    if (!decoded) continue;
    const { account, yesVotes, noVotes, abstainVotes } = decoded;
    if (isCast) {
      voterToVotes[account] = {
        [VoteType.Yes]: yesVotes,
        [VoteType.No]: noVotes,
        [VoteType.Abstain]: abstainVotes,
      };
    } else {
      voterToVotes[account] = EmptyVoteAmounts;
    }
  }
}

export function getLargestVoteType(votes: VoteAmounts) {
  let maxType = VoteType.None;
  let maxValue = 0n;

  for (const [type, value] of Object.entries(votes)) {
    if (value && value > maxValue) {
      maxType = type as VoteType;
      maxValue = value;
    }
  }

  return { type: maxType, value: maxValue };
}

export function decodeVoteEventLog(log: Event) {
  try {
    if (!log.topics || log.topics.length < 3) return null;
    const { eventName, args } = decodeEventLog({
      abi: governanceABI,
      data: log.data,
      topics: log.topics,
      strict: false,
    });

    let proposalId: number | undefined;
    let account: string | undefined;
    let yesVotes: bigint = 0n;
    let noVotes: bigint = 0n;
    let abstainVotes: bigint = 0n;

    if (eventName === 'ProposalVoted' || eventName === 'ProposalVoteRevoked') {
      proposalId = Number(args.proposalId);
      account = args.account;
      yesVotes = (BigInt(args.value!) === 3n && BigInt(args.weight!)) || 0n;
      noVotes = (BigInt(args.value!) === 2n && BigInt(args.weight!)) || 0n;
      abstainVotes = (BigInt(args.value!) === 1n && BigInt(args.weight!)) || 0n;
    } else if (eventName === 'ProposalVotedV2' || eventName === 'ProposalVoteRevokedV2') {
      proposalId = Number(args.proposalId);
      account = args.account;
      yesVotes = BigInt(args.yesVotes!) || 0n;
      noVotes = BigInt(args.noVotes!) || 0n;
      abstainVotes = BigInt(args.abstainVotes!) || 0n;
    } else {
      logger.warn('Invalid event name, expected ProposalVoted', eventName);
      return null;
    }

    if (!proposalId || !account || !isValidAddress(account)) return null;

    return {
      proposalId,
      account,
      yesVotes,
      noVotes,
      abstainVotes,
    };
  } catch (error) {
    logger.warn('Error decoding event log', error, log);
    return null;
  }
}
