import { DuneFeeRow } from 'src/features/buyback/types';

const DUNE_API = 'https://api.dune.com/api/v1';

// Celo Mainnet sequencer-fee P&L query (same source as report.py).
export const CELO_PNL_QUERY_ID = 6898547;

// Dune bills /results by datapoints per request and rejects pages above the
// plan's allowance with HTTP 402; 100 rows x 17 columns stays under it on the
// plan the dashboard key uses, and the whole history is only a few pages.
const PAGE_SIZE = 100;
const MAX_ROWS = 10_000; // safety cap: ~one row per day since L2 genesis
const FETCH_TIMEOUT_MS = 30_000;
const COMPLETED_STATE = 'QUERY_STATE_COMPLETED';

interface DuneResultsResponse {
  /** Terminal state of the execution the results belong to. */
  state?: string;
  execution_id?: string;
  execution_started_at?: string;
  execution_ended_at?: string;
  /** Offset of the next page; absent on the last page. */
  next_offset?: number;
  result?: { rows?: DuneFeeRow[]; metadata?: { total_row_count?: number } };
}

export interface DuneFeeResults {
  rows: DuneFeeRow[];
  /** When Dune started the execution these rows come from (ISO timestamp), if known. */
  executionStartedAt: string | null;
  /** When Dune last finished executing the query (ISO timestamp), if known. */
  executionEndedAt: string | null;
}

/**
 * Read the latest cached results of the Dune P&L query via the read-only
 * `/results` endpoint, so a page visit never spends execution credits. The
 * query itself is re-executed once a day by the refresh-buyback-dune-query
 * GitHub Actions cron — deliberately not from this public request path, where
 * cache-busting traffic could be used to burn Dune credits.
 *
 * The first page names the execution it came from and every later page is read
 * from that execution, so a refresh that completes mid-pagination cannot mix
 * two result sets. Throws rather than returning a partial history, and rejects
 * a page whose execution did not complete: Dune answers 200 for failed,
 * cancelled, expired and partial executions too, with the rows missing, which
 * would otherwise read as a valid dashboard of zeros.
 */
export async function fetchDuneFeeRows(
  apiKey: string,
  queryId: number = CELO_PNL_QUERY_ID,
): Promise<DuneFeeResults> {
  const rows: DuneFeeRow[] = [];
  let executionId: string | null = null;
  let executionStartedAt: string | null = null;
  let executionEndedAt: string | null = null;
  let totalRowCount: number | null = null;
  let offset: number | null = 0;

  while (offset !== null) {
    if (rows.length >= MAX_ROWS) {
      throw new Error(`Dune query ${queryId} returned more than ${MAX_ROWS} rows`);
    }
    const path = executionId ? `execution/${executionId}/results` : `query/${queryId}/results`;
    const url = `${DUNE_API}/${path}?limit=${PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url, {
      headers: { 'X-Dune-API-Key': apiKey },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Dune API ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as DuneResultsResponse;
    const batch = data.result?.rows;
    if (data.state !== COMPLETED_STATE || !Array.isArray(batch)) {
      throw new Error(
        `Dune query ${queryId} has no completed result (state ${data.state ?? 'missing'})`,
      );
    }
    executionId ??= data.execution_id ?? null;
    executionStartedAt ??= data.execution_started_at ?? null;
    executionEndedAt ??= data.execution_ended_at ?? null;
    totalRowCount ??= data.result?.metadata?.total_row_count ?? null;
    rows.push(...batch);
    offset = nextOffset(data, offset, batch.length);
  }

  if (totalRowCount !== null && rows.length < totalRowCount) {
    throw new Error(`Dune returned ${rows.length} of ${totalRowCount} rows for query ${queryId}`);
  }

  return { rows, executionStartedAt, executionEndedAt };
}

/**
 * Dune marks the last page by omitting `next_offset`. Fall back to the page
 * size when the field is missing so an API change cannot silently truncate the
 * history to one page.
 */
function nextOffset(data: DuneResultsResponse, offset: number, batchLength: number): number | null {
  if (typeof data.next_offset === 'number') return data.next_offset;
  return batchLength === PAGE_SIZE ? offset + batchLength : null;
}
