interface TriggerStatusUpdateParams {
  cgpNumber: number;
  onchainId: number;
  status: 'EXPIRED' | 'REJECTED';
  executedAt?: undefined;
}

interface TriggerStatusUpdateExecuted {
  cgpNumber: number;
  onchainId: number;
  status: 'EXECUTED';
  executedAt: string; // ISO timestamp string
}

/**
 * Triggers the update-cgp-status workflow in the celo-org/governance repository
 * Requires GitHub Actions context with GITHUB_TOKEN
 */
export async function triggerGovernanceRepoStatusUpdate(
  params: TriggerStatusUpdateParams | TriggerStatusUpdateExecuted,
): Promise<void> {
  const { cgpNumber, onchainId, status, executedAt } = params;

  // Prepare workflow inputs
  const inputs: Record<string, string> = {
    cgp_number: cgpNumber.toString(),
    status,
    onchain_id: onchainId.toString(),
    dry_run: 'true',
  };

  // Add date_executed for EXECUTED status
  if (status === 'EXECUTED' && executedAt) {
    // Convert to YYYY-MM-DD format
    const date = new Date(executedAt);
    inputs.date_executed = date.toISOString().split('T')[0];
  }

  try {
    // Check if we're in GitHub Actions context
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('❌ GITHUB_TOKEN not found. This function must run in GitHub Actions context.');
      return;
    }

    // Use GitHub REST API to trigger the workflow
    const owner = 'celo-org';
    const repo = 'governance';
    const workflowId = 'update-cgp-status.yml';

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API returned ${response.status}: ${errorText}`);
    }

    console.log(
      `✅ Triggered governance repo update for CGP ${cgpNumber} (proposal ${onchainId}) -> ${status}`,
    );
  } catch (error) {
    console.error(
      `❌ Failed to trigger governance repo update for CGP ${cgpNumber}:`,
      error instanceof Error ? error.message : error,
    );
    // Don't throw - we don't want to fail the entire script if one update fails
  }
}
