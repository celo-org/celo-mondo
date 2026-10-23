import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { triggerGovernanceRepoStatusUpdate } from './syncGovernanceRepoStatus';

const { mockCreateWorkflowDispatch } = vi.hoisted(() => ({
  mockCreateWorkflowDispatch: vi.fn(),
}));

vi.mock('octokit', () => ({
  Octokit: class {
    rest = { actions: { createWorkflowDispatch: mockCreateWorkflowDispatch } };
  },
}));

describe('triggerGovernanceRepoStatusUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GOVERNANCE_REPO_TOKEN', 'test-token');
    mockCreateWorkflowDispatch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('dispatches the governance workflow as a dry run', async () => {
    await triggerGovernanceRepoStatusUpdate({ cgpNumber: 254, onchainId: 314, status: 'REJECTED' });

    expect(mockCreateWorkflowDispatch).toHaveBeenCalledWith({
      owner: 'celo-org',
      repo: 'governance',
      workflow_id: 'update-cgp-status.yml',
      ref: 'main',
      inputs: { cgp_number: '254', onchain_id: '314', status: 'REJECTED', dry_run: 'true' },
    });
  });

  it('sends the execution date as YYYY-MM-DD', async () => {
    await triggerGovernanceRepoStatusUpdate({
      cgpNumber: 254,
      onchainId: 314,
      status: 'EXECUTED',
      executedAt: '2026-10-20 23:15:00.123',
    });

    expect(mockCreateWorkflowDispatch.mock.calls[0][0].inputs.date_executed).toBe('2026-10-20');
  });

  it('skips the dispatch without a token', async () => {
    vi.stubEnv('GOVERNANCE_REPO_TOKEN', '');

    await triggerGovernanceRepoStatusUpdate({ cgpNumber: 254, onchainId: 314, status: 'EXPIRED' });

    expect(mockCreateWorkflowDispatch).not.toHaveBeenCalled();
  });

  it('does not throw when the dispatch fails', async () => {
    mockCreateWorkflowDispatch.mockRejectedValueOnce(
      new Error('Resource not accessible by integration'),
    );

    await expect(
      triggerGovernanceRepoStatusUpdate({ cgpNumber: 254, onchainId: 314, status: 'EXPIRED' }),
    ).resolves.toBeUndefined();
  });
});
