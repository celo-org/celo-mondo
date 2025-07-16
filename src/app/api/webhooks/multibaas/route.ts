import { governanceABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { Event } from 'src/app/governance/events';
import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
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

  for (const {
    data: { event },
  } of body) {
    // NOTE: in theory we _could_ just insert the `event.rawFields` directly in the db...
    await fetchHistoricalEventsAndSaveToDBProgressively(event.name, celoPublicClient);

    const eventData: Event = JSON.parse(event.rawFields);

    // NOTE: for clarity, we don't need to parallelize `handleXXXEvent`
    // sine they just exit early when the event doesnt match

    await handleProposalEvent(event.name!, eventData, event.inputs, celoPublicClient).then(
      async (proposal) => {
        if (!proposal) return;

        await database
          .insert(proposalsTable)
          .values(proposal)
          .onConflictDoUpdate({
            set: {
              // NOTE: normally only the stage should be updated over time...
              stage: sql`excluded."stage"`,
              // NOTE: but maybe other things were updated in github?
              author: sql`excluded."author"`,
              url: sql`excluded."url"`,
              cgpUrl: sql`excluded."cgpUrl"`,
              cgpUrlRaw: sql`excluded."cgpUrlRaw"`,
              title: sql`excluded."title"`,
            },
            target: [proposalsTable.chainId, proposalsTable.id],
          });

        console.info(`Upserted proposal ${proposal.id} to stage ${proposal.stage}`);

        const allProposals = await database
          .select({
            id: proposalsTable.id,
          })
          .from(proposalsTable)
          .where(sql`${proposalsTable.cgp} = ${proposal.cgp}`)
          .groupBy(proposalsTable.cgp);

        const ids = allProposals.map((x) => x.id);
        while (ids.length > 1) {
          const [pastId] = ids.splice(0, 1);
          await database
            .update(proposalsTable)
            .set({ pastId: pastId })
            .where(sql`${proposalsTable.id} = ${ids.at(0)}`);
        }
      },
    );

    await handleVoteEvent(event.name!, eventData, celoPublicClient).then(async (rows) => {
      if (!rows.length) return;

      const { count } = await database
        .insert(votesTable)
        .values(rows)
        .onConflictDoUpdate({
          set: { count: sql`excluded.count` },
          target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
        });
      console.info(`Inserted ${count} vote records for proposal: ${rows[0].proposalId}`);
    });
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
    return false;
  }
  return JSON.parse(payload);
}
