import { governanceABI } from '@celo/abis';
import { Event } from 'src/app/governance/events';
import { assertEvent } from 'src/features/governance/utils/votes';
import { decodeEventLog } from 'viem';

const ALLOWED_EVENTS = [
  'ProposalExecuted',
  'ProposalApproved',
  'ProposalExpired',
  'ProposalDequeued',
  'ProposalQueued',
] as const;

export async function decodeAndPrepareProposalEvent(
  eventName: string,
  event: Event,
): Promise<bigint | null> {
  if (!assertEvent(ALLOWED_EVENTS, eventName)) {
    // eslint-disable-next-line no-console
    console.info('Not a proposal event');
    return null;
  }

  const { topics, data } = event;
  const {
    args: { proposalId },
  } = decodeEventLog({
    abi: governanceABI,
    topics,
    data,
    eventName,
  });
  if (!proposalId) {
    throw new Error('Couldnt decode the proposal event: ' + JSON.stringify(event));
  }

  return proposalId;
}
