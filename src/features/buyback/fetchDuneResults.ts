import { DuneFeeRow } from 'src/features/buyback/types';
import { logger } from 'src/utils/logger';

const DUNE_API = 'https://api.dune.com/api/v1';

// Celo Mainnet sequencer-fee P&L query (same source as report.py).
export const CELO_PNL_QUERY_ID = 6898547;

const PAGE_SIZE = 1000;
const MAX_ROWS = 10_000; // safety cap: ~one row per day since L2 genesis

// Re-execute the query when its last run is older than this. 20 hours (not 24)
// so the daily refresh doesn't drift later each day — triggers only happen on
// visits, so each refresh lands a bit after the threshold.
const REFRESH_AFTER_MS = 20 * 60 * 60 * 1000;

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
 * `/results` endpoint. Paginates until the query is exhausted.
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

// Last refresh trigger per server instance. Best-effort dedup only — on
// serverless each instance has its own copy, but the route's response cache
// already limits how often the check runs at all.
let lastTriggeredAtMs = 0;

/**
 * Keep the Dune data at most a day old: if the query's last execution is older
 * than the refresh threshold, kick off a new execution (spends one Dune
 * execution credit). Fire-and-forget from the caller's perspective — the
 * current request still serves the existing results; a later visitor picks up
 * the fresh ones once Dune finishes.
 */
export async function refreshDuneQueryIfStale(
  apiKey: string,
  executionEndedAt: string | null,
  queryId: number = CELO_PNL_QUERY_ID,
): Promise<void> {
  const endedAtMs = executionEndedAt ? Date.parse(executionEndedAt) : 0;
  if (Number.isFinite(endedAtMs) && Date.now() - endedAtMs < REFRESH_AFTER_MS) return;
  if (Date.now() - lastTriggeredAtMs < REFRESH_AFTER_MS) return;

  lastTriggeredAtMs = Date.now();
  try {
    const response = await fetch(`${DUNE_API}/query/${queryId}/execute`, {
      method: 'POST',
      headers: { 'X-Dune-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ performance: 'medium' }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Dune execute ${response.status}: ${body.slice(0, 200)}`);
    }
    logger.info(`Triggered Dune query ${queryId} refresh (last run: ${executionEndedAt})`);
  } catch (error) {
    // Reset the guard so the next request can retry the trigger.
    lastTriggeredAtMs = 0;
    logger.warn('Failed to trigger Dune query refresh', error);
  }
}
