/* eslint no-console: 0 */
import { Octokit } from 'octokit';
import { separateYamlFrontMatter } from 'src/features/governance/fetchFromRepository';
import { ProposalMetadataStatus } from 'src/features/governance/types';

interface BaseStatusUpdate {
  cgpNumber: number;
  onchainId: number;
}

export type GovernanceStatusUpdate =
  | (BaseStatusUpdate & {
      status: ProposalMetadataStatus.EXPIRED | ProposalMetadataStatus.REJECTED;
    })
  | (BaseStatusUpdate & { status: ProposalMetadataStatus.EXECUTED; executedAt: string });

const GOVERNANCE_REPO = { owner: 'celo-org', repo: 'governance' } as const;
const WORKFLOW_ID = 'update-cgp-status.yml';
const WORKFLOW_REF = 'main';
const CGP_RAW_URL_BASE = `https://raw.githubusercontent.com/${GOVERNANCE_REPO.owner}/${GOVERNANCE_REPO.repo}/${WORKFLOW_REF}/CGPs/cgp-`;

export interface GovernanceRepoStatus {
  status: ProposalMetadataStatus;
  /** The on-chain proposal id the CGP file currently points at, if any. */
  proposalId: number | null;
}

/**
 * Reads the status and proposal id a CGP currently carries in the governance
 * repository. Returns null when the file cannot be read or parsed.
 */
export async function fetchGovernanceRepoStatus(
  cgpNumber: number,
): Promise<GovernanceRepoStatus | null> {
  const url = `${CGP_RAW_URL_BASE}${String(cgpNumber).padStart(4, '0')}.md`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const frontMatter = separateYamlFrontMatter(await response.text())?.frontMatter;
    const status: unknown = frontMatter?.status;
    if (!isMetadataStatus(status)) throw new Error(`unexpected status ${String(status)}`);
    const proposalId = Number(frontMatter['governance-proposal-id']);
    return { status, proposalId: Number.isFinite(proposalId) ? proposalId : null };
  } catch (error) {
    console.error(
      `❌ Could not read CGP ${cgpNumber} from the governance repo:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

function isMetadataStatus(value: unknown): value is ProposalMetadataStatus {
  return Object.values(ProposalMetadataStatus).includes(value as ProposalMetadataStatus);
}

/**
 * Triggers the update-cgp-status workflow in the celo-org/governance repository.
 *
 * The token GitHub Actions hands a workflow only reaches the repository that
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

  if (update.status === ProposalMetadataStatus.EXECUTED) {
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
