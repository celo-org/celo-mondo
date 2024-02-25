import { config } from 'src/config/config';
import { links } from 'src/config/links';
import { fetchWithTimeout, retryAsync } from 'src/utils/async';
import { logger } from 'src/utils/logger';
import { ExplorerResponse, TransactionLog } from './types';

/**
 * @param relativeUrl The relative URL to query (e.g. /api?module=account&action=balance&address=0x1234)
 */
export function queryCeloscanLogs(address: Address, topicParams: string) {
  // Not using from block 0 here because of some explorers have issues with incorrect txs in low blocks
  const url = `/api?module=logs&action=getLogs&fromBlock=100&toBlock=latest&address=${address}&${topicParams}`;
  return queryCeloscanPath<TransactionLog[]>(url);
}

/**
 * @param path the path including query params but excluding API key
 */
export async function queryCeloscanPath<R>(path: string) {
  const url = new URL(path, links.celoscanApi);
  logger.debug(`Querying celoscan: ${url.toString()}`);
  if (config.celoscanApiKey) url.searchParams.append('apikey', config.celoscanApiKey);
  const result = await retryAsync(() => executeQuery<R>(url.toString()));
  return result;
}

async function executeQuery<R>(url: string) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Fetch response not okay: ${response.status}`);
  }
  const json = (await response.json()) as ExplorerResponse<R>;

  if (!json.result) {
    const responseText = await response.text();
    throw new Error(`Invalid result format: ${responseText}`);
  }

  return json.result;
}
