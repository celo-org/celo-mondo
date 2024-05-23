import { config } from 'src/config/config';
import { links } from 'src/config/links';
import {
  StakeActivationRequest,
  StakeActivationRequestSchema,
} from 'src/features/staking/autoActivation';
import { logger } from 'src/utils/logger';
import { errorToString } from 'src/utils/strings';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  logger.debug('Stake schedule request received');
  let activationRequest: StakeActivationRequest;
  try {
    const body = await request.json();
    activationRequest = StakeActivationRequestSchema.parse(body);
  } catch (error) {
    logger.warn('Request validation error', error);
    return new Response('Invalid stake activation request', {
      status: 400,
    });
  }

  try {
    const { address, transactionHash } = activationRequest;
    logger.debug(`Posting to Upstash for address ${address} with tx ${transactionHash}`);
    const upstashBase = new URL(links.upstash);
    upstashBase.pathname += `/${links.home}/staking/api/activate`;
    const response = await fetch(upstashBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.upstashKey}`,
        'Upstash-Delay': '1d',
      },
      body: JSON.stringify(activationRequest),
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    logger.debug(`Stake activation scheduled successfully for address ${address}`);
    return new Response(`Stake activation scheduled for ${address}. Tx hash: ${transactionHash}`, {
      status: 200,
    });
  } catch (error) {
    logger.error('Stake activation scheduler error', error);
    return new Response(`Unable to schedule stake activation: ${errorToString(error)}`, {
      status: 500,
    });
  }
}
