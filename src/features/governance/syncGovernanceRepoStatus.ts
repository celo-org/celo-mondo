/* eslint no-console: 0 */
import { Octokit } from 'octokit';

interface BaseStatusUpdate {
  cgpNumber: number;
  onchainId: number;
}

type GovernanceStatusUpdate =
  | (BaseStatusUpdate & { status: 'EXPIRED' | 'REJECTED' })
  | (BaseStatusUpdate & { status: 'EXECUTED'; executedAt: string });

const GOVERNANCE_REPO = { owner: 'celo-org', repo: 'governance' } as const;
const WORKFLOW_ID = 'update-cgp-status.yml';
const WORKFLOW_REF = 'main';

/**
 * Triggers the update-cgp-status workflow in the celo-org/governance repository.
 *
 * The token GitHub Actions hands to a workflow only reaches the repository that
 * workflow runs in, so dispatching into the governance repository needs
 * GOVERNANCE_REPO_TOKEN: a token with Actions write access on that repository.
 * Without it the update is logged and skipped.
 *
 * Note: all dispatches are dry runs for now (dry_run: 'true').
 */
export async function triggerGovernanceRepoStatusUpdate(
  update: GovernanceStatusUpdate,
): Promise<void> {
  const token = process.env.GOVERNANCE_REPO_TOKEN;
  if (!token) {
    console.error('❌ GOVERNANCE_REPO_TOKEN not set, skipping governance repo update.');
    return;
  }

  const inputs: Record<string, string> = {
    cgp_number: String(update.cgpNumber),
    onchain_id: String(update.onchainId),
    status: update.status,
    dry_run: 'true',
  };

  if (update.status === 'EXECUTED') {
    // The governance workflow expects a YYYY-MM-DD date. executedAt is the UTC
    // timestamp string from the database, so its first ten characters are that date.
    inputs.date_executed = update.executedAt.slice(0, 10);
  }

  try {
    const octokit = new Octokit({ auth: token });
    await octokit.rest.actions.createWorkflowDispatch({
      ...GOVERNANCE_REPO,
      workflow_id: WORKFLOW_ID,
      ref: WORKFLOW_REF,
      inputs,
    });

    console.log(
      `✅ Triggered governance repo update for CGP ${update.cgpNumber} (proposal ${update.onchainId}) -> ${update.status}`,
    );
  } catch (error) {
    // Don't throw — a single failed dispatch shouldn't fail the whole script.
    console.error(
      `❌ Failed to trigger governance repo update for CGP ${update.cgpNumber}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
