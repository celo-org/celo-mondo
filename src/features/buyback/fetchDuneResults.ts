import { DuneFeeRow } from 'src/features/buyback/types';

const DUNE_API = 'https://api.dune.com/api/v1';

// Celo Mainnet sequencer-fee P&L query (same source as report.py).
export const CELO_PNL_QUERY_ID = 6898547;

const PAGE_SIZE = 1000;
const MAX_ROWS = 10_000; // safety cap: ~one row per day since L2 genesis
const FETCH_TIMEOUT_MS = 30_000;

interface DuneResultsResponse {
  execution_ended_at?: string;
  result?: { rows?: DuneFeeRow[] };
}

export interface DuneFeeResults {
  rows: DuneFeeRow[];
  /** When Dune last finished executing the query (ISO timestamp), if known. */
  executionEndedAt: string | null;
}

/**
 * Read the latest cached results of the Dune P&L query via the read-only
 * `/results` endpoint, so a page visit never spends execution credits. The
 * query itself is re-executed once a day by the refresh-buyback-dune-query
 * GitHub Actions cron — deliberately not from this public request path, where
 * cache-busting traffic could be used to burn Dune credits. Paginates until
 * the query is exhausted.
 */
export async function fetchDuneFeeRows(
  apiKey: string,
  queryId: number = CELO_PNL_QUERY_ID,
): Promise<DuneFeeResults> {
  const rows: DuneFeeRow[] = [];
  let executionEndedAt: string | null = null;
  let offset = 0;

  while (rows.length < MAX_ROWS) {
    const url = `${DUNE_API}/query/${queryId}/results?limit=${PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url, {
      headers: { 'X-Dune-API-Key': apiKey },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Dune API ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as DuneResultsResponse;
    executionEndedAt ??= data.execution_ended_at ?? null;
    const batch = data.result?.rows ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    offset += batch.length;
  }

  return { rows, executionEndedAt };
}
