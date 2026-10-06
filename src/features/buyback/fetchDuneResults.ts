import { parseDay } from 'src/features/buyback/computeStats';
import { DuneFeeRow } from 'src/features/buyback/types';
import { z } from 'zod';

export const DUNE_API = 'https://api.dune.com/api/v1';

// Celo Mainnet sequencer-fee P&L query (same source as report.py).
export const CELO_PNL_QUERY_ID = 6898547;

// Dune bills /results by datapoints per request and rejects pages above the
// plan's allowance with HTTP 402; 100 rows x 17 columns stays under it on
// every plan, and the whole history is only a few pages.
const PAGE_SIZE = 100;
const MAX_ROWS = 10_000; // safety cap: ~one row per day since L2 genesis
const MAX_PAGES = MAX_ROWS / PAGE_SIZE;
const FETCH_TIMEOUT_MS = 30_000;

export const COMPLETED_STATE = 'QUERY_STATE_COMPLETED';
// An execution in one of these states may still complete; anything else that
// is not completed (failed, cancelled, expired, partial) never will.
export const PENDING_STATES: ReadonlySet<string> = new Set([
  'QUERY_STATE_PENDING',
  'QUERY_STATE_EXECUTING',
]);

/**
 * A request to Dune that did not get a usable answer: a network failure, a
 * timeout, a non-2xx status or a body that is not a JSON object. Unlike a
 * validation failure, this says nothing about the execution itself and is
 * worth retrying.
 */
export class DuneRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'DuneRequestError';
  }
}

/**
 * Call a Dune endpoint and return its JSON body as an object. Anything short
 * of that is a `DuneRequestError`: a network failure or timeout, a non-2xx
 * status (with the start of Dune's reason in the message), a truncated or
 * garbled body, or a body that parses but is not an object.
 */
export async function requestDune(
  path: string,
  apiKey: string,
  { method = 'GET', body }: { method?: 'GET' | 'POST'; body?: string } = {},
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${DUNE_API}/${path}`, {
      method,
      headers: {
        'X-Dune-API-Key': apiKey,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new DuneRequestError(
        `Dune API ${response.status}: ${text.slice(0, 200)}`,
        response.status,
      );
    }
    const parsed: unknown = await response.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new DuneRequestError(
        `Dune API returned a ${parsed === null ? 'null' : typeof parsed} body`,
        null,
      );
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof DuneRequestError) throw error;
    throw new DuneRequestError(`Dune API unreachable: ${String(error)}`, null);
  }
}

// Fees, costs and prices are absolute amounts. A negative one is a sign error
// upstream that would lower revenue or raise profit, so it is refused here;
// the derived P&L may of course go negative.
const amount = z.number().finite().nonnegative();
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
  // A real calendar day, optionally followed by a time, as the computation reads it.
  day: z.string().refine((value) => parseDay(value) !== '', 'not a UTC calendar day'),
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
  state?: unknown;
  execution_id?: unknown;
  execution_started_at?: unknown;
  execution_ended_at?: unknown;
  /** Offset of the next page; absent on the last page. */
  next_offset?: unknown;
  result?: { rows?: unknown; metadata?: { total_row_count?: unknown } };
}

/** One validated page of results. */
interface DunePage {
  rows: DuneFeeRow[];
  state: string;
  executionId: string | null;
  executionStartedAt: string | null;
  executionEndedAt: string | null;
  totalRowCount: number | null;
  nextOffset: number | null;
}

/** Which execution a query's results currently come from. */
export interface DuneExecution {
  executionId: string;
  /** Its state as Dune reports it; only a completed execution has results. */
  state: string;
  /** When Dune started that execution (ISO timestamp), if known. */
  executionStartedAt: string | null;
  /** When it finished (ISO timestamp), if known. */
  executionEndedAt: string | null;
}

export interface DuneFeeResults {
  rows: DuneFeeRow[];
  /** When Dune started the execution these rows come from (ISO timestamp), if known. */
  executionStartedAt: string | null;
  /** When Dune last finished executing the query (ISO timestamp), if known. */
  executionEndedAt: string | null;
}

/**
 * Which execution the query's results currently come from, read with a
 * single-row page. Dune bills results by datapoints, so this is the cheap way
 * to learn whether, and when, the query was last executed.
 */
export async function fetchLatestExecution(
  apiKey: string,
  queryId: number = CELO_PNL_QUERY_ID,
): Promise<DuneExecution> {
  // Only the execution metadata matters here. Neither the state nor the row
  // is judged, so a failed execution or one with unusable rows still gets an
  // id and a state for the caller to decide on.
  const page = await fetchPage(`query/${queryId}/results?limit=1&offset=0`, apiKey, queryId, {
    metadataOnly: true,
  });
  // A response with no execution id is unusable like a garbled one: a
  // transient problem, not a verdict on anything.
  if (page.executionId === null) {
    throw new DuneRequestError(`Dune query ${queryId} named no execution for its results`, null);
  }
  return {
    executionId: page.executionId,
    state: page.state,
    executionStartedAt: page.executionStartedAt,
    executionEndedAt: page.executionEndedAt,
  };
}

/**
 * Read the full results of the Dune P&L query via the read-only `/results`
 * endpoints. The daily refresh (src/scripts/refreshBuybackStats.ts) is the
 * only caller: the app serves what that refresh stored and never talks to
 * Dune itself, so page traffic can neither spend Dune credits nor be left
 * waiting on Dune.
 *
 * Every page is read from one execution: the one given, or the one the first
 * page names, so a refresh that completes mid-pagination cannot mix two result
 * sets. The read either returns the whole history or throws: a page whose
 * execution did not complete, a malformed row, a page that does not advance, a
 * row count that differs from the one Dune reports, and an empty result are
 * all errors.
 */
export async function fetchDuneFeeRows(
  apiKey: string,
  queryId: number = CELO_PNL_QUERY_ID,
  executionId: string | null = null,
): Promise<DuneFeeResults> {
  const rows: DuneFeeRow[] = [];
  let first: DunePage | null = null;
  let offset: number | null = 0;

  for (let page = 0; offset !== null; page++) {
    if (page >= MAX_PAGES) {
      throw new Error(`Dune query ${queryId} returned more than ${MAX_ROWS} rows`);
    }
    const pinned = executionId ?? first?.executionId ?? null;
    const path: string = pinned ? `execution/${pinned}/results` : `query/${queryId}/results`;
    const current: DunePage = await fetchPage(
      `${path}?limit=${PAGE_SIZE}&offset=${offset}`,
      apiKey,
      queryId,
    );
    first ??= current;
    rows.push(...current.rows);

    if (current.nextOffset !== null) {
      if (current.nextOffset <= offset) {
        throw new Error(`Dune query ${queryId} paging did not advance past offset ${offset}`);
      }
      if (executionId === null && first.executionId === null) {
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
  // The query has returned a row per day since L2 genesis, so a completed but
  // empty result means the query or its sources broke, not that nothing happened.
  if (rows.length === 0) {
    throw new Error(`Dune query ${queryId} completed with no rows`);
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
async function fetchPage(
  path: string,
  apiKey: string,
  queryId: number,
  { metadataOnly = false }: { metadataOnly?: boolean } = {},
): Promise<DunePage> {
  const data: DuneResultsResponse = await requestDune(path, apiKey);
  const state = typeof data.state === 'string' ? data.state : 'missing';
  if (metadataOnly) {
    return pageFrom(data, state, []);
  }
  if (state !== COMPLETED_STATE || !Array.isArray(data.result?.rows)) {
    // A run that may still finish is worth asking about again soon; one that
    // never will is a verdict on that execution.
    if (PENDING_STATES.has(state)) {
      throw new DuneRequestError(`Dune query ${queryId} is still executing (state ${state})`, null);
    }
    throw new Error(`Dune query ${queryId} has no completed result (state ${state})`);
  }
  return pageFrom(data, state, parseDuneFeeRows(data.result.rows, queryId));
}

function pageFrom(data: DuneResultsResponse, state: string, rows: DuneFeeRow[]): DunePage {
  const totalRowCount = data.result?.metadata?.total_row_count;
  const text = (value: unknown) => (typeof value === 'string' ? value : null);
  return {
    rows,
    state,
    executionId: text(data.execution_id),
    executionStartedAt: text(data.execution_started_at),
    executionEndedAt: text(data.execution_ended_at),
    totalRowCount: typeof totalRowCount === 'number' ? totalRowCount : null,
    // Dune marks the last page by omitting next_offset.
    nextOffset: typeof data.next_offset === 'number' ? data.next_offset : null,
  };
}
