import { config } from 'src/config/config';
import { links } from 'src/config/links';
import { fetchWithTimeout, retryAsync, sleep } from 'src/utils/async';
import { logger } from 'src/utils/logger';
import { ExplorerResponse, TransactionLog } from './types';

// celoscan has a limit of 1000 results per query https://docs.celoscan.io/api-endpoints/logs
const CELO_SCAN_MAX_RESULTS = 1000;

/**
 * @param address the contract address to query logs on,
 * @param topicParams the encoded topic params for the events
 *
 */
export async function queryCeloscanLogs(address: Address, topicParams: string) {
  // Not using from block 0 here because of some explorers have issues with incorrect txs in low blocks
  // (some queries ie votes for proposals could probably be switched to an even higher starting block)
  const fromBlock = '100';
  const url = `/api?${topicParams}&`;
  const baseParams = new URLSearchParams({
    module: 'logs',
    action: 'getLogs',
    fromBlock,
    toBlock: 'latest',
    address: address,
    offset: CELO_SCAN_MAX_RESULTS.toString(), // refers to how many entries per page to return
    page: '1',
  });
  let result = await queryCeloscanPath<TransactionLog[]>(`${url}${baseParams.toString()}`);

  let latestQueryLength = result.length;
  let page = 1;
  while (latestQueryLength === CELO_SCAN_MAX_RESULTS) {
    page++;
    baseParams.set('page', page.toString());
    // sleep to avoid rate limiting
    await sleep(200);
    const nextResults = await queryCeloscanPath<TransactionLog[]>(`${url}${baseParams.toString()}`);
    result = [...result, ...nextResults];
    latestQueryLength = nextResults.length;
  }
  return result as TransactionLog[];
}

/**
 * @param path the path including query params but excluding API key
 */
export async function queryCeloscanPath<R>(path: string) {
  const url = new URL(path, links.celoscanApi);
  logger.debug(`Querying celoscan: ${url.toString()}`);
  if (config.celoscanApiKey) url.searchParams.set('apikey', config.celoscanApiKey);
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
