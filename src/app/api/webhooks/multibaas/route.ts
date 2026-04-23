import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { sendAlertToSlack } from 'src/config/slackbot';
import { Address } from 'viem';
import { type EventName, type ParsedEvent, processWebhookEvents } from '../processWebhookEvents';

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
      contract: {
        address: Address;
        addressLabel: string;
        name: string;
        label: string;
      };
      indexInLog: number;
    };
  };
};

export async function POST(request: NextRequest): Promise<Response> {
  // Feature flag: only process if MultiBaas is the active webhook provider.
  // When Alchemy is active, return 200 immediately so MultiBaas stops
  // retrying, but skip all processing so only one provider writes to the DB.
  const activeProvider = process.env.ACTIVE_WEBHOOK_PROVIDER ?? 'alchemy';
  if (activeProvider !== 'multibaas') {
    return new Response(null, { status: 200 });
  }

  const rawBody = await request.text();
  const body = assertSignature(
    rawBody,
    request.headers.get('X-MultiBaas-Signature'),
    request.headers.get('X-MultiBaas-Timestamp'),
  );
  if (!body) {
    return new Response(null, { status: 403 });
  }

  try {
    const parsedEvents: ParsedEvent[] = [];
    for (const {
      data: { event },
    } of body) {
      let parsedFields: { topics?: unknown[]; data?: string; args?: Record<string, unknown> } = {};
      try {
        parsedFields = JSON.parse(event.rawFields);
      } catch {
        // rawFields parsing failed
      }

      const transactionIds: bigint[] = [];
      // Extract transactionId from rawFields args
      const argsTransactionId = parsedFields.args?.transactionId;
      if (argsTransactionId !== undefined) {
        transactionIds.push(BigInt(argsTransactionId as string));
      }
      // Extract transactionId from inputs array as an additional source
      const txIdInput = event.inputs.find((i) => i.name === 'transactionId');
      if (txIdInput) {
        transactionIds.push(BigInt(txIdInput.value));
      }

      parsedEvents.push({
        name: event.name,
        contractAddress: event.contract.address,
        topics: (parsedFields.topics ?? []) as [`0x${string}`, ...`0x${string}`[]],
        data: (parsedFields.data ?? '0x') as `0x${string}`,
        transactionIds,
      });
    }

    if (!parsedEvents.length) {
      return new Response(null, { status: 200 });
    }

    await processWebhookEvents(parsedEvents);
    return new Response(null, { status: 200 });
  } catch (err) {
    const error = err as Error;
    await sendAlertToSlack(`
Failed to process celo-mondo webhook:
\`\`\`json
${JSON.stringify(body)}
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
    return false;
  }
  return JSON.parse(payload);
}
