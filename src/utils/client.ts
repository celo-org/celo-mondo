import { config, fornoRpcUrl } from 'src/config/config';
import { Account, createPublicClient, createWalletClient, http } from 'viem';

export const celoPublicClient = createPublicClient({
  chain: config.chain,
  transport: config.chain.testnet ? http() : http(fornoRpcUrl),
  batch: {
    multicall: true,
  },
});

/**
 * Client backed by the non-rate-limited archive node, for heavy historical reads
 * (e.g. eth_getLogs over wide block ranges). Public forno rejects such ranges with
 * "query exceeds range, retry smaller", so any code that scans event history —
 * notably the webhook backfill — must use this client, the same way the cron
 * scripts do. Falls back to the forno-backed client on testnet or when the archive
 * node env var is not set (e.g. local dev).
 */
const archiveNodeUrl = process.env.PRIVATE_NO_RATE_LIMITED_NODE;
export const celoArchiveClient =
  config.chain.testnet || !archiveNodeUrl
    ? celoPublicClient
    : createPublicClient({
        chain: config.chain,
        transport: http(archiveNodeUrl),
        batch: {
          multicall: true,
        },
      });

export const createCeloWalletClient = (account: Account) =>
  createWalletClient({
    account,
    chain: config.chain,
    transport: config.chain.testnet ? http() : http(fornoRpcUrl),
  });
