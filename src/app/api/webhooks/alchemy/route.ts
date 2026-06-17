import { governanceABI, multiSigABI } from '@celo/abis';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { sendAlertToSlack } from 'src/config/slackbot';
import { decodeEventLog } from 'viem';
import {
  type EventName,
  MULTISIG_EVENT_NAMES,
  type ParsedEvent,
  processWebhookEvents,
} from '../processWebhookEvents';

const TOPIC0_TO_EVENT_NAME: Record<string, EventName> = {
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
  // The Alchemy provider is enabled by configuring its signing key. When the key
  // is absent the provider is considered disabled, so we acknowledge (200) and
  // no-op instead of erroring — this lets Alchemy and MultiBaas run side by side
  // (each gated by its own secret) without an exclusive provider selector.
  const signingKey = process.env.ALCHEMY_SIGNING_KEY;
  if (!signingKey) {
    return new Response(null, { status: 200 });
  }

  const rawBody = await request.text();
  const payload = assertSignature(rawBody, request.headers.get('x-alchemy-signature'), signingKey);
  if (!payload) {
    return new Response(null, { status: 403 });
  }

  try {
    const { block } = payload.event.data;
    const parsedEvents: ParsedEvent[] = [];
    for (const log of block.logs) {
      if (log.transaction.status !== 1) {
        continue;
      }

      const eventName = TOPIC0_TO_EVENT_NAME[log.topics[0]];
      if (!eventName) continue;

      const topics = log.topics as [`0x${string}`, ...`0x${string}`[]];
      const data = log.data as `0x${string}`;
      const abi = MULTISIG_EVENT_NAMES.has(eventName) ? multiSigABI : governanceABI;

      const transactionIds: bigint[] = [];
      try {
        const decoded = decodeEventLog({ abi, data, topics, strict: false });
        const args = serializeBigInts(decoded.args) as Record<string, unknown>;
        if (args?.transactionId !== undefined) {
          transactionIds.push(BigInt(args.transactionId as string));
        }
      } catch {
        // Leave transactionIds empty if decode fails
      }

      parsedEvents.push({
        name: eventName,
        contractAddress: log.account.address,
        topics,
        data,
        blockNumber: BigInt(block.number),
        transactionHash: log.transaction.hash as `0x${string}`,
        transactionIds,
      });
    }

    if (!parsedEvents.length) {
      return new Response(null, { status: 200 });
    }

    await processWebhookEvents(parsedEvents, 'alchemy');
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
