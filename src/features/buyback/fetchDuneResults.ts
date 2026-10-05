import { DuneFeeRow } from 'src/features/buyback/types';
import { z } from 'zod';

const DUNE_API = 'https://api.dune.com/api/v1';

// Celo Mainnet sequencer-fee P&L query (same source as report.py).
export const CELO_PNL_QUERY_ID = 6898547;

// Dune bills /results by datapoints per request and rejects pages above the
// plan's allowance with HTTP 402; 100 rows x 17 columns stays under it on the
// plan the dashboard key uses, and the whole history is only a few pages.
const PAGE_SIZE = 100;
const MAX_ROWS = 10_000; // safety cap: ~one row per day since L2 genesis
const MAX_PAGES = MAX_ROWS / PAGE_SIZE;
const FETCH_TIMEOUT_MS = 30_000;
const COMPLETED_STATE = 'QUERY_STATE_COMPLETED';

const amount = z.number().finite();
// Columns the query fills through a LEFT JOIN are null on a day with no such
// cost (or price) row. Every other column is a sum and always has a value.
const joinedAmount = amount.nullable();

/**
 * The columns the dashboard reads, as Dune returns them: doubles as JSON
 * numbers. A column that is missing, renamed or of another type must fail the
 * read: treated leniently it would count as zero and understate fees or costs
 * on a dashboard that looks healthy.
 */
const duneFeeRowSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'not a day'),
  fee_CELO: amount,
  fee_USDT: amount,
  fee_USDm: amount,
  fee_EURm: amount,
  fee_USDC: amount,
  fee_CELO_usd: amount,
  fee_EURm_usd: amount,
  others_usd: amount,
  batcher_cost_eth: joinedAmount,
  proposer_cost_eth: joinedAmount,
  challenger_cost_eth: joinedAmount,
  EigenDA_cost_eth: joinedAmount,
  eth_price_usd: joinedAmount,
}) satisfies z.ZodType<DuneFeeRow>;

/** Validate result rows, naming the first offending row and column. */
export function parseDuneFeeRows(rows: unknown, queryId: number): DuneFeeRow[] {
  const parsed = z.array(duneFeeRowSchema).safeParse(rows);
  if (parsed.success) return parsed.data;
  const [issue] = parsed.error.issues;
  throw new Error(
    `Dune query ${queryId} returned a malformed row (${issue.path.join('.')}: ${issue.message})`,
  );
}

interface DuneResultsResponse {
  /** Terminal state of the execution the results belong to. */
  state?: string;
  execution_id?: string;
  execution_started_at?: string;
  execution_ended_at?: string;
  /** Offset of the next page; absent on the last page. */
  next_offset?: number;
  result?: { rows?: unknown; metadata?: { total_row_count?: number } };
}

/** One validated page of results. */
interface DunePage {
  rows: DuneFeeRow[];
  executionId: string | null;
  executionStartedAt: string | null;
  executionEndedAt: string | null;
  totalRowCount: number | null;
  nextOffset: number | null;
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
 * two result sets. The read either returns the whole history or throws: a page
 * whose execution did not complete, a malformed row, a page that does not
 * advance, and a row count that differs from the one Dune reports are all
 * errors.
 */
export async function fetchDuneFeeRows(
  apiKey: string,
  queryId: number = CELO_PNL_QUERY_ID,
): Promise<DuneFeeResults> {
  const rows: DuneFeeRow[] = [];
  let first: DunePage | null = null;
  let offset: number | null = 0;

  for (let page = 0; offset !== null; page++) {
    if (page >= MAX_PAGES) {
      throw new Error(`Dune query ${queryId} returned more than ${MAX_ROWS} rows`);
    }
    const path: string = first
      ? `execution/${first.executionId}/results`
      : `query/${queryId}/results`;
    const current: DunePage = await fetchPage(
      `${DUNE_API}/${path}?limit=${PAGE_SIZE}&offset=${offset}`,
      apiKey,
      queryId,
    );
    first ??= current;
    rows.push(...current.rows);

    if (current.nextOffset !== null) {
      if (current.nextOffset <= offset) {
        throw new Error(`Dune query ${queryId} paging did not advance past offset ${offset}`);
      }
      if (first.executionId === null) {
        throw new Error(`Dune query ${queryId} has more pages but named no execution to read`);
      }
    }
    offset = current.nextOffset;
  }

  const totalRowCount = first?.totalRowCount ?? null;
  if (totalRowCount === null) {
    throw new Error(`Dune query ${queryId} did not report its row count`);
  }
  if (rows.length !== totalRowCount) {
    throw new Error(`Dune returned ${rows.length} of ${totalRowCount} rows for query ${queryId}`);
  }

  return {
    rows,
    executionStartedAt: first?.executionStartedAt ?? null,
    executionEndedAt: first?.executionEndedAt ?? null,
  };
}

/**
 * Fetch and validate one page. Dune answers 200 for failed, cancelled, expired
 * and partial executions too, with the rows missing, which would otherwise
 * read as a valid dashboard of zeros.
 */
async function fetchPage(url: string, apiKey: string, queryId: number): Promise<DunePage> {
  const response = await fetch(url, {
    headers: { 'X-Dune-API-Key': apiKey },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dune API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as DuneResultsResponse;
  if (data.state !== COMPLETED_STATE || !Array.isArray(data.result?.rows)) {
    throw new Error(
      `Dune query ${queryId} has no completed result (state ${data.state ?? 'missing'})`,
    );
  }
  const rows = parseDuneFeeRows(data.result.rows, queryId);

  const totalRowCount = data.result?.metadata?.total_row_count;
  return {
    rows,
    executionId: data.execution_id ?? null,
    executionStartedAt: data.execution_started_at ?? null,
    executionEndedAt: data.execution_ended_at ?? null,
    totalRowCount: typeof totalRowCount === 'number' ? totalRowCount : null,
    // Dune marks the last page by omitting next_offset.
    nextOffset: typeof data.next_offset === 'number' ? data.next_offset : null,
  };
}
