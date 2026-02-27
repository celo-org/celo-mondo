import { ST_CELO_API_URL } from 'src/config/consts';
import { fetchWithTimeout } from 'src/utils/async';
import { logger } from 'src/utils/logger';

type ActionType = 'withdraw' | 'claim' | ['rebalanceDefault', 'rebalance', 'revoke', 'activate']; // must be this order

async function sendRequest(action: ActionType, address?: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      ST_CELO_API_URL,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ beneficiary: address, type: action }),
      },
      180000,
    );

    if (!response.ok) {
      logger.warn(`stCELO API: ${action} failed with status ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.warn(`stCELO API: ${action} failed`, error);
    return false;
  }
}

export const afterDeposit = (): Promise<boolean> =>
  sendRequest(['rebalanceDefault', 'rebalance', 'revoke', 'activate']);
export const withdraw = (address: string): Promise<boolean> => sendRequest('withdraw', address);
export const claim = (address: string): Promise<boolean> => sendRequest('claim', address);
