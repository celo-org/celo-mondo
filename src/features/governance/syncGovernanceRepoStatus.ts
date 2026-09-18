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
 * Requires a GitHub Actions context with GITHUB_TOKEN.
 *
 * Note: all dispatches are dry runs for now (dry_run: 'true').
 */
export async function triggerGovernanceRepoStatusUpdate(
  update: GovernanceStatusUpdate,
): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN not found. This function must run in GitHub Actions context.');
    return;
  }

  const inputs: Record<string, string> = {
    cgp_number: String(update.cgpNumber),
    onchain_id: String(update.onchainId),
    status: update.status,
    dry_run: 'true',
  };

  if (update.status === 'EXECUTED') {
    // The governance workflow expects a YYYY-MM-DD date.
    inputs.date_executed = new Date(update.executedAt).toISOString().split('T')[0];
  }

  try {
    const octokit = new Octokit({ auth: githubToken });
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
