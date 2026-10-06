import {
  COMPLETED_STATE,
  DuneRequestError,
  PENDING_STATES,
  requestDune,
} from 'src/features/buyback/fetchDuneResults';

const POLL_INTERVAL_MS = 10_000;
const WAIT_TIMEOUT_MS = 10 * 60_000;

/** How an execution ended, once Dune reports it finished. */
export interface ExecutionOutcome {
  executionId: string;
  state: string;
  /** Whether it completed; only then does it have results to read. */
  completed: boolean;
}

export interface WaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  log?: (message: string) => void;
}

/**
 * Start a billed execution of the query and return its id.
 *
 * The request is sent once and never retried: it is not idempotent, and
 * resending it after a lost response would enqueue (and bill) a second
 * execution while only the last id is polled. A refusal carries Dune's reason
 * in the error. The default engine tier is used: Dune rejects "medium" and
 * "large".
 */
export async function executeDuneQuery(apiKey: string, queryId: number): Promise<string> {
  const data = await requestDune(`query/${queryId}/execute`, apiKey, {
    method: 'POST',
    body: '{}',
  });
  const executionId = data.execution_id;
  if (typeof executionId !== 'string' || executionId === '') {
    throw new Error(
      `Dune did not return an execution id for query ${queryId}: ${JSON.stringify(data).slice(0, 200)}`,
    );
  }
  return executionId;
}

/**
 * Poll an execution's status until Dune reports it finished, as report.py's
 * wait_for_execution does. A failed request or an unreadable status body is
 * retried on the next tick. A run still going when the timeout passes is an
 * error, so a stuck refresh fails loudly instead of leaving stale data.
 */
export async function waitForExecution(
  apiKey: string,
  executionId: string,
  { pollIntervalMs = POLL_INTERVAL_MS, timeoutMs = WAIT_TIMEOUT_MS, log }: WaitOptions = {},
): Promise<ExecutionOutcome> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const state = await readState(apiKey, executionId, log);
    if (state !== null && !PENDING_STATES.has(state)) {
      return { executionId, state, completed: state === COMPLETED_STATE };
    }
    if (state !== null) log?.(`State: ${state}, waiting...`);
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for Dune execution ${executionId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

/** The execution's state, or null when this check did not get a readable one. */
async function readState(
  apiKey: string,
  executionId: string,
  log: WaitOptions['log'],
): Promise<string | null> {
  try {
    const status = await requestDune(`execution/${executionId}/status`, apiKey);
    if (typeof status.state === 'string' && status.state !== '') return status.state;
    log?.('Unreadable status response, retrying...');
    return null;
  } catch (error) {
    // A transient API hiccup should not fail the refresh; try again next tick.
    if (!(error instanceof DuneRequestError)) throw error;
    log?.(`Status check failed (${error.message}), retrying...`);
    return null;
  }
}
