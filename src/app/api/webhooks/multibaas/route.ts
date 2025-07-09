import { governanceABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import database from 'src/config/database';
import { votesTable } from 'src/db/schema';
import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
import {
  decodeVoteEventLog,
  fetchProposalVoters,
} from 'src/features/governance/hooks/useProposalVoters';
import { VoteType } from 'src/features/governance/types';
import { celoPublicClient } from 'src/utils/client';
import { GetContractEventsParameters } from 'viem';

type EventName = GetContractEventsParameters<typeof governanceABI>['eventName'];
type MultibassEvent = {
  id: string;
  event: 'event.emitted';
  data: {
    triggeredAt: string;
    event: {
      name: EventName;
      signature: string;
      inputs: { name: string; value: string; hashed: boolean; type: string }[];
      rawFields: string;
      contract: { address: Address; addressLabel: string; name: string; label: string };
      indexInLog: number;
    };
  };
};

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  if (
    !assertSignature(
      body,
      request.headers.get('X-MultiBaas-Signature'),
      request.headers.get('X-MultiBaas-Timestamp'),
    )
  ) {
    return new Response(null, { status: 403 });
  }

  for (const {
    data: { event },
  } of body) {
    // in theory we _could_ just insert the `event.rawFields` directly in the db...
    await fetchHistoricalEventsAndSaveToDBProgressively(event.name, celoPublicClient);

    if (
      (
        [
          'ProposalVoted',
          'ProposalVotedV2',
          'ProposalVoteRevoked',
          'ProposalVoteRevokedV2',
        ] as EventName[]
      ).includes(event.name)
    ) {
      const proposal = decodeVoteEventLog(JSON.parse(event.rawFields));
      if (!proposal || !proposal.proposalId) {
        throw new Error('Couldnt update the votes');
      }

      const { totals } = await fetchProposalVoters(proposal.proposalId);
      await database
        .insert(votesTable)
        .values(
          Object.entries(totals).map(([type, count]) => ({
            type: type as VoteType,
            count,
            chainId: celoPublicClient.chain.id,
            proposalId: proposal.proposalId,
          })),
        )
        .onConflictDoUpdate({
          set: { count: sql`excluded.count` },
          target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
        });
    }
  }

  return new Response(null, { status: 200 });
}

function assertSignature(
  payload: unknown,
  signature: string | null,
  timestamp: string | null,
): payload is MultibassEvent[] {
  if (!payload || !signature || !timestamp) {
    return false;
  }

  const hmac = createHmac('sha256', process.env.MULTIBAAS_WEBHOOK_SECRET!);
  hmac.update(Buffer.from(JSON.stringify(payload)));
  hmac.update(timestamp);
  const signature_ = hmac.digest().toString('hex');

  if (signature !== signature_) {
    console.log({
      payload,
      json: JSON.stringify(payload),
      signature,
      signature_,
    });
    return false;
  }
  return true;
}
