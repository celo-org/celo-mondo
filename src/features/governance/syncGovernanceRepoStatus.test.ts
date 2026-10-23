import { ProposalMetadataStatus } from 'src/features/governance/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchGovernanceRepoStatus,
  triggerGovernanceRepoStatusUpdate,
} from './syncGovernanceRepoStatus';

const { mockCreateWorkflowDispatch } = vi.hoisted(() => ({
  mockCreateWorkflowDispatch: vi.fn(),
}));

vi.mock('octokit', () => ({
  Octokit: class {
    rest = { actions: { createWorkflowDispatch: mockCreateWorkflowDispatch } };
  },
}));

describe('fetchGovernanceRepoStatus', () => {
  const cgpFile = (status: string, proposalId?: number) =>
    `---\ncgp: 254\ntitle: Something\nstatus: ${status}\n` +
    (proposalId ? `governance-proposal-id: ${proposalId}\n` : '') +
    `---\n# Body\n`;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the status and proposal id from the CGP front matter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(cgpFile('EXECUTED', 314))));

    expect(await fetchGovernanceRepoStatus(254)).toEqual({
      status: ProposalMetadataStatus.EXECUTED,
      proposalId: 314,
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/celo-org/governance/main/CGPs/cgp-0254.md',
      expect.anything(),
    );
  });

  it('accepts a lower-case status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(cgpFile('executed', 314))));

    expect(await fetchGovernanceRepoStatus(254)).toEqual({
      status: ProposalMetadataStatus.EXECUTED,
      proposalId: 314,
    });
  });

  it('reports no proposal id when the front matter has none', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(cgpFile('PROPOSED'))));

    expect(await fetchGovernanceRepoStatus(254)).toEqual({
      status: ProposalMetadataStatus.PROPOSED,
      proposalId: null,
    });
  });

  it('returns null when the file is missing or carries an unknown status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })));
    expect(await fetchGovernanceRepoStatus(9999)).toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(cgpFile('SOMETHING'))));
    expect(await fetchGovernanceRepoStatus(254)).toBeNull();
  });
});

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
    await triggerGovernanceRepoStatusUpdate({
      cgpNumber: 254,
      onchainId: 314,
      status: ProposalMetadataStatus.REJECTED,
    });

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
      status: ProposalMetadataStatus.EXECUTED,
      executedAt: '2026-10-20 23:15:00.123',
    });

    expect(mockCreateWorkflowDispatch.mock.calls[0][0].inputs.date_executed).toBe('2026-10-20');
  });

  it('skips the dispatch without a token', async () => {
    vi.stubEnv('GOVERNANCE_REPO_TOKEN', '');

    await triggerGovernanceRepoStatusUpdate({
      cgpNumber: 254,
      onchainId: 314,
      status: ProposalMetadataStatus.EXPIRED,
    });

    expect(mockCreateWorkflowDispatch).not.toHaveBeenCalled();
  });

  it('does not throw when the dispatch fails', async () => {
    mockCreateWorkflowDispatch.mockRejectedValueOnce(
      new Error('Resource not accessible by integration'),
    );

    await expect(
      triggerGovernanceRepoStatusUpdate({
        cgpNumber: 254,
        onchainId: 314,
        status: ProposalMetadataStatus.EXPIRED,
      }),
    ).resolves.toBeUndefined();
  });
});
