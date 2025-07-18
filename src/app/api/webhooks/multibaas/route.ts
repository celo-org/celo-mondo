import { governanceABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { Event } from 'src/app/governance/events';
import database from 'src/config/database';
import { votesTable } from 'src/db/schema';
import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
import updateProposalsInDB from 'src/features/governance/updateProposalsInDB';
import { handleProposalEvent } from 'src/features/governance/utils/events/proposal';
import { handleVoteEvent } from 'src/features/governance/utils/events/vote';
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
  const rawBody = await request.text();
  const body = assertSignature(
    rawBody,
    request.headers.get('X-MultiBaas-Signature'),
    request.headers.get('X-MultiBaas-Timestamp'),
  );
  if (!body) {
    return new Response(null, { status: 403 });
  }

  const proposalIdsToUpdate: Set<bigint> = new Set();
  for (const {
    data: { event },
  } of body) {
    // NOTE: in theory we _could_ just insert the `event.rawFields` directly in the db...
    await fetchHistoricalEventsAndSaveToDBProgressively(event.name!, celoPublicClient);

    const eventData: Event = JSON.parse(event.rawFields);

    // NOTE: for clarity, we don't need to parallelize `handleXXXEvent`
    // since they just exit early when the event doesnt match
    const proposalId = await handleProposalEvent(event.name!, eventData);
    if (proposalId) {
      proposalIdsToUpdate.add(proposalId);
    }

    await handleVoteEvent(event.name!, eventData, celoPublicClient.chain.id).then(async (rows) => {
      if (!rows.length) return;

      const { count } = await database
        .insert(votesTable)
        .values(rows)
        .onConflictDoUpdate({
          set: { count: sql`excluded.count` },
          target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
        });
      console.info(`Inserted ${count} vote records for proposal: ${rows[0].proposalId}`);
      // NOTE: we're pushing the proposalId because voting for a proposal means the
      // networkWeight will be changed and needs to be updated
      proposalIdsToUpdate.add(BigInt(rows[0].proposalId));
    });
  }

  if (proposalIdsToUpdate.size) {
    await updateProposalsInDB(celoPublicClient, [...proposalIdsToUpdate], 'update');
  }

  return new Response(null, { status: 200 });
}

function assertSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null,
): MultibassEvent[] | false {
  if (!payload || !signature || !timestamp) {
    return false;
  }

  const hmac = createHmac('sha256', process.env.MULTIBAAS_WEBHOOK_SECRET!);
  hmac.update(Buffer.from(payload));
  hmac.update(timestamp);
  const signature_ = hmac.digest().toString('hex');

  if (signature !== signature_) {
    console.info({
      payload,
      json: payload,
      signature,
      signature_,
    });
    writeFileSync(
      '/Users/nicolasbrugneaux/workspace/celo-mondo/logs/' + Date.now() + '-error.json',
      JSON.stringify({
        payload,
        signature,
        signature_,
        timestamp,
        secret: process.env.MULTIBAAS_WEBHOOK_SECRET!,
      }),
    );
    return false;
  }
  return JSON.parse(payload);
}
