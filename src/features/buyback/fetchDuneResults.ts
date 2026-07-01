import { DuneFeeRow } from 'src/features/buyback/types';

const DUNE_API = 'https://api.dune.com/api/v1';

// Celo Mainnet sequencer-fee P&L query (same source as report.py).
export const CELO_PNL_QUERY_ID = 6898547;

const PAGE_SIZE = 1000;
const MAX_ROWS = 10_000; // safety cap: ~one row per day since L2 genesis

interface DuneResultsResponse {
  result?: { rows?: DuneFeeRow[] };
}

/**
 * Read the latest cached results of the Dune P&L query. Uses the read-only
 * `/results` endpoint so it never spends execution credits — the query is
 * refreshed on Dune's own schedule. Paginates until the query is exhausted.
 */
export async function fetchDuneFeeRows(
  apiKey: string,
  queryId: number = CELO_PNL_QUERY_ID,
): Promise<DuneFeeRow[]> {
  const rows: DuneFeeRow[] = [];
  let offset = 0;

  while (rows.length < MAX_ROWS) {
    const url = `${DUNE_API}/query/${queryId}/results?limit=${PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url, {
      headers: { 'X-Dune-API-Key': apiKey },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Dune API ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as DuneResultsResponse;
    const batch = data.result?.rows ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    offset += batch.length;
  }

  return rows;
}
