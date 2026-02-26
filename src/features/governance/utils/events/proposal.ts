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

  try {
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
      // eslint-disable-next-line no-console
      console.error('Could not decode proposal event, skipping:', JSON.stringify(event));
      return null;
    }

    return proposalId;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to decode proposal event, skipping:', error);
    return null;
  }
}
