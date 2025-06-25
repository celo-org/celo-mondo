import { governanceABI } from '@celo/abis';
import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
import { celoPublicClient } from 'src/utils/client';
import { GetContractEventsParameters } from 'viem';

type MultibassEvent = {
  id: string;
  event: 'event.emitted';
  data: {
    triggeredAt: string;
    event: {
      name: GetContractEventsParameters<typeof governanceABI>['eventName'];
      signature: string;
      inputs: { name: string; value: string; hashed: boolean; type: string }[];
      rawFields: string;
      contract: { address: Address; addressLabel: string; name: string; label: string };
      indexInLog: number;
    };
  };
};

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json()) as object;
  if (
    !assertSignature(
      body,
      request.headers.get('X-MultiBaas-Signature'),
      request.headers.get('X-MultiBaas-Timestamp'),
    )
  ) {
    return new Response(null, { status: 403 });
  }

  // in theory we _could_ just insert the `event.rawFields` directly in the db...
  await fetchHistoricalEventsAndSaveToDBProgressively(body.data.event.name, celoPublicClient);

  return new Response(null, { status: 200 });
}

function assertSignature(
  payload: object,
  signature: string | null,
  timestamp: string | null,
): payload is MultibassEvent {
  if (!payload || !signature || !timestamp) {
    return false;
  }

  const hmac = createHmac('sha256', process.env.MULTIBAAS_WEBHOOK_SECRET!);
  hmac.update(Buffer.from(JSON.stringify(payload)));
  hmac.update(timestamp);
  const signature_ = hmac.digest().toString('hex');

  console.log({ payload, signature, timestamp, signature_ });

  if (signature !== signature_) {
    return false;
  }

  return true;
}
