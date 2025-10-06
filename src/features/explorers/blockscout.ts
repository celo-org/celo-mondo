import { config } from 'src/config/config';
import { links } from 'src/config/links';
import { fetchWithTimeout, retryAsync, sleep } from 'src/utils/async';
import { logger } from 'src/utils/logger';
import { celo } from 'viem/chains';
import { ExplorerResponse, TransactionLog } from './types';

// Blockscout has a limit of 1000 results per query https://docs.blockscout.com/devs/apis/rpc/logs
const BLOCKSCOUT_MAX_RESULTS = 1000;

/**
 * @param address the contract address to query logs on,
 * @param topicParams the encoded topic params for the events
 *
 */
export async function queryCeloBlockscoutLogs(address: Address, topicParams: string) {
  // Not using from block 0 here because of some explorers have issues with incorrect txs in low blocks
  // (some queries ie votes for proposals could probably be switched to an even higher starting block)
  const fromBlock = '100';

  const url = `/api?${topicParams}&`;
  const params = new URLSearchParams({
    topicParams,
    chainid: celo.id.toString(),
    module: 'logs',
    action: 'getLogs',
    fromBlock,
    toBlock: 'latest',
    address: address,
  });

  let result = await queryCeloBlockscoutPath<TransactionLog[]>(`${url}${params.toString()}`);

  let latestQueryLength = result.length;
  while (latestQueryLength > 0 && latestQueryLength === BLOCKSCOUT_MAX_RESULTS) {
    const lastBlockTS = parseInt(result.at(-1)!.timeStamp, 16) * 1000;
    if (lastBlockTS + 5_000 > Date.now()) {
      break;
    }
    const nextBlock = BigInt(result.at(-1)!.blockNumber!) + BigInt(1);
    params.set('fromBlock', nextBlock.toString());
    // sleep to avoid rate limiting
    await sleep(200);
    const nextResults = await queryCeloBlockscoutPath<TransactionLog[]>(
      `${url}${params.toString()}`,
    );
    result = [...result, ...nextResults];
    latestQueryLength = nextResults.length;
  }

  return result;
}

/**
 * @param path the path including query params but excluding API key
 */
export async function queryCeloBlockscoutPath<R>(path: string) {
  const url = new URL(path, links.blockscoutApi);
  logger.debug(`Querying blockscout: ${url.toString()}`);
  if (config.celoBlockscoutApiKey) {
    url.searchParams.set('apikey', config.celoBlockscoutApiKey);
  }
  return await retryAsync(() => executeQuery<R>(url.toString()));
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
