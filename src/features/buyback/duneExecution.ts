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
  /** When Dune started it (ISO timestamp), if reported; a queued one starts later than it was submitted. */
  executionStartedAt: string | null;
  executionEndedAt: string | null;
}

/** What one status check learned. */
interface ExecutionStatus {
  state: string;
  executionStartedAt: string | null;
  executionEndedAt: string | null;
}

/** The execution was still running when the wait ran out. */
export class DuneWaitTimeoutError extends Error {
  constructor(readonly executionId: string) {
    super(`Timed out waiting for Dune execution ${executionId}`);
    this.name = 'DuneWaitTimeoutError';
  }
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
 * retried on the next tick. A run still going when the timeout passes is a
 * `DuneWaitTimeoutError`, so a stuck refresh fails loudly instead of leaving
 * stale data, or is replaced when the caller can do that.
 */
export async function waitForExecution(
  apiKey: string,
  executionId: string,
  { pollIntervalMs = POLL_INTERVAL_MS, timeoutMs = WAIT_TIMEOUT_MS, log }: WaitOptions = {},
): Promise<ExecutionOutcome> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const status = await readStatus(apiKey, executionId, log);
    if (status !== null && !PENDING_STATES.has(status.state)) {
      return { executionId, ...status, completed: status.state === COMPLETED_STATE };
    }
    if (status !== null) log?.(`State: ${status.state}, waiting...`);
    if (Date.now() >= deadline) throw new DuneWaitTimeoutError(executionId);
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

/** The execution's status, or null when this check did not get a readable one. */
async function readStatus(
  apiKey: string,
  executionId: string,
  log: WaitOptions['log'],
): Promise<ExecutionStatus | null> {
  try {
    const status = await requestDune(`execution/${executionId}/status`, apiKey);
    const text = (value: unknown) => (typeof value === 'string' ? value : null);
    if (typeof status.state === 'string' && status.state !== '') {
      return {
        state: status.state,
        executionStartedAt: text(status.execution_started_at),
        executionEndedAt: text(status.execution_ended_at),
      };
    }
    log?.('Unreadable status response, retrying...');
    return null;
  } catch (error) {
    // A transient API hiccup should not fail the refresh; try again next tick.
    if (!(error instanceof DuneRequestError)) throw error;
    log?.(`Status check failed (${error.message}), retrying...`);
    return null;
  }
}
