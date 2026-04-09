import { governanceABI, multiSigABI } from '@celo/abis';
import { and, eq, or, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { Event } from 'src/app/governance/events';
import database from 'src/config/database';
import { sendAlertToSlack } from 'src/config/slackbot';
import { eventsAlchemyTable, votesAlchemyTable } from 'src/db/schema';
import { EmptyVoteAmounts, VoteAmounts, VoteType } from 'src/features/governance/types';
import { decodeVoteEventLog } from 'src/features/governance/utils/votes';
import { celoPublicClient } from 'src/utils/client';
import { decodeEventLog } from 'viem';

const MULTISIG_EVENT_NAMES = new Set(['Confirmation', 'Revocation', 'Execution']);
const VOTE_EVENT_NAMES = new Set([
  'ProposalVoted',
  'ProposalVotedV2',
  'ProposalVoteRevoked',
  'ProposalVoteRevokedV2',
]);

const TOPIC0_TO_EVENT_NAME: Record<string, string> = {
  '0x1bfe527f3548d9258c2512b6689f0acfccdd0557d80a53845db25fc57e93d8fe': 'ProposalQueued',
  '0x3e069fb74dcf5fbc07740b0d40d7f7fc48e9c0ca5dc3d19eb34d2e05d74c5543': 'ProposalDequeued',
  '0x28ec9e38ba73636ceb2f6c1574136f83bd46284a3c74734b711bf45e12f8d929': 'ProposalApproved',
  '0x712ae1383f79ac853f8d882153778e0260ef8f03b504e2866e0593e04d2b291f': 'ProposalExecuted',
  '0xf3709dc32cf1356da6b8a12a5be1401aeb00989556be7b16ae566e65fef7a9df': 'ProposalVoted',
  '0x683ebddc94b5b0a7dae3d1b6c168ad05684fcfd831b24ecb5ea9ecdf5524d028': 'ProposalVotedV2',
  '0xb59283e3d5436f05576bddef72ddbfb6344c216ed6ea6d7ced2e9bbb94c661ab': 'ProposalVoteRevoked',
  '0x6791653c96b4863b3768c664e9a03e1094ae334ba9d35862627ceeebd1abcc1f': 'ProposalVoteRevokedV2',
  '0xd19965d25ef670a1e322fbf05475924b7b12d81fd6b96ab718b261782efb3d62': 'ProposalUpvoted',
  '0x7dc46237a819c9171a9c037ec98928e563892905c4d23373ca0f3f500f4ed114': 'ProposalUpvoteRevoked',
  '0x88e53c486703527139dfc8d97a1e559d9bd93d3f9d52cda4e06564111e7a2643': 'ProposalExpired',
  '0x4a504a94899432a9846e1aa406dceb1bcfd538bb839071d49d1e5e23f5be30ef': 'Confirmation',
  '0xf6a317157440607f36269043eb55f1287a5a19ba2216afeab88cd46cbcfb88e9': 'Revocation',
  '0x0c18aae526accb31b01cf9a15bdf435e70632ee31efc4c5c0752c4262ea45d2f': 'Execution',
};

type AlchemyLog = {
  index: number;
  data: string;
  topics: string[];
  account: { address: string };
  transaction: {
    hash: string;
    index: number;
    from: { address: string };
    to: { address: string };
    status: number;
  };
};

type AlchemyWebhookPayload = {
  webhookId: string;
  id: string;
  createdAt: string;
  type: string;
  event: {
    data: {
      block: {
        number: number;
        timestamp: number;
        logs: AlchemyLog[];
      };
    };
    sequenceNumber: string;
  };
};

export async function POST(request: NextRequest): Promise<Response> {
  const rawBody = await request.text();
  const signingKey = process.env.ALCHEMY_SIGNING_KEY;
  if (!signingKey) {
    // eslint-disable-next-line no-console
    console.error('ALCHEMY_SIGNING_KEY env var is not set');
    return new Response(null, { status: 500 });
  }

  const payload = assertSignature(rawBody, request.headers.get('x-alchemy-signature'), signingKey);
  if (!payload) {
    return new Response(null, { status: 403 });
  }

  try {
    const { block } = payload.event.data;
    const chainId = celoPublicClient.chain.id;
    const rows: (typeof eventsAlchemyTable)['$inferInsert'][] = [];

    for (const log of block.logs) {
      const eventName = TOPIC0_TO_EVENT_NAME[log.topics[0]];
      if (!eventName) continue;

      const abi = MULTISIG_EVENT_NAMES.has(eventName) ? multiSigABI : governanceABI;
      let args: Record<string, unknown> = {};
      try {
        const decoded = decodeEventLog({
          abi,
          data: log.data as `0x${string}`,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
          strict: false,
        });
        args = serializeBigInts(decoded.args) as Record<string, unknown>;
      } catch {
        // Leave args empty if decode fails
      }

      rows.push({
        chainId,
        eventName: eventName as (typeof rows)[number]['eventName'],
        args,
        address: log.account.address.toLowerCase(),
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        data: log.data as `0x${string}`,
        blockNumber: BigInt(block.number),
        transactionHash: log.transaction.hash as `0x${string}`,
      });
    }

    if (rows.length > 0) {
      await database.insert(eventsAlchemyTable).values(rows).onConflictDoNothing();
    }

    const voteProposalIds = new Set<number>();
    for (const row of rows) {
      if (VOTE_EVENT_NAMES.has(row.eventName as string)) {
        const proposalId = (row.args as Record<string, unknown>)?.proposalId;
        if (proposalId !== undefined) voteProposalIds.add(Number(proposalId));
      }
    }

    for (const proposalId of voteProposalIds) {
      await upsertAlchemyVotes(proposalId, chainId);
    }

    return new Response(null, { status: 200 });
  } catch (err) {
    const error = err as Error;
    await sendAlertToSlack(`
Failed to process celo-mondo alchemy webhook:
\`\`\`json
${JSON.stringify(payload)}
\`\`\`

\`\`\`
name: ${error.name}
message: ${error.message}
stack: ${error.stack}
\`\`\`
    `);

    return new Response(null, { status: 500 });
  }
}

async function upsertAlchemyVotes(proposalId: number, chainId: number) {
  const voteEvents = await database
    .select()
    .from(eventsAlchemyTable)
    .where(
      and(
        eq(eventsAlchemyTable.chainId, chainId),
        or(
          eq(eventsAlchemyTable.eventName, 'ProposalVoted'),
          eq(eventsAlchemyTable.eventName, 'ProposalVotedV2'),
        ),
        sql`(${eventsAlchemyTable.args}->>'proposalId')::bigint = ${proposalId}`,
      ),
    );

  const voterToVotes: Record<string, VoteAmounts> = {};
  for (const event of voteEvents) {
    const decoded = decodeVoteEventLog(event as unknown as Event);
    if (!decoded) continue;
    voterToVotes[decoded.account] = {
      [VoteType.Yes]: decoded.yesVotes,
      [VoteType.No]: decoded.noVotes,
      [VoteType.Abstain]: decoded.abstainVotes,
    };
  }

  const totals = Object.values(voterToVotes).reduce<VoteAmounts>(
    (acc, votes) => {
      acc[VoteType.Yes] += votes[VoteType.Yes];
      acc[VoteType.No] += votes[VoteType.No];
      acc[VoteType.Abstain] += votes[VoteType.Abstain];
      return acc;
    },
    { ...EmptyVoteAmounts },
  );

  const { count } = await database
    .insert(votesAlchemyTable)
    .values(
      Object.entries(totals).map(([type, count]) => ({
        type: type as VoteType,
        count,
        chainId,
        proposalId,
      })),
    )
    .onConflictDoUpdate({
      set: { count: sql`excluded.count` },
      target: [votesAlchemyTable.proposalId, votesAlchemyTable.type, votesAlchemyTable.chainId],
    });

  // eslint-disable-next-line no-console
  console.info(`Upserted ${count} alchemy vote records for proposal: ${proposalId}`);
}

function assertSignature(
  payload: string,
  signature: string | null,
  signingKey: string,
): AlchemyWebhookPayload | false {
  if (!payload || !signature) return false;
  const computed = createHmac('sha256', signingKey).update(payload, 'utf8').digest('hex');
  if (computed !== signature) return false;
  return JSON.parse(payload);
}

function serializeBigInts(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeBigInts);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeBigInts(v)]),
    );
  }
  return value;
}
