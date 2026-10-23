import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import { ProposalMetadataStatus, ProposalStage } from 'src/features/governance/types';
import { TEST_CHAIN_ID } from 'src/test/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reconcileGovernanceRepoStatus } from './reconcileGovernanceRepoStatus';

const { mockFetchStatus, mockTrigger } = vi.hoisted(() => ({
  mockFetchStatus: vi.fn(),
  mockTrigger: vi.fn(),
}));

vi.mock('src/features/governance/syncGovernanceRepoStatus', () => ({
  fetchGovernanceRepoStatus: mockFetchStatus,
  triggerGovernanceRepoStatusUpdate: mockTrigger,
}));

const NOW = new Date('2026-10-23T12:00:00.000Z');

function daysAgo(days: number, hours = 0): string {
  return new Date(NOW.getTime() - (days * 24 + hours) * 60 * 60 * 1000).toISOString();
}

function insertProposal(
  overrides: Partial<typeof proposalsTable.$inferInsert> & { id: number; stage: ProposalStage },
) {
  return database.insert(proposalsTable).values({
    author: 'test',
    cgp: overrides.id,
    chainId: TEST_CHAIN_ID,
    timestamp: 1753277605,
    title: `Proposal ${overrides.id}`,
    ...overrides,
  });
}

function reportedUpdates() {
  return mockTrigger.mock.calls.map(([update]) => update);
}

describe('reconcileGovernanceRepoStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchStatus.mockResolvedValue(ProposalMetadataStatus.PROPOSED);
    mockTrigger.mockResolvedValue(undefined);
  });

  it('reports an executed proposal the governance repo still lists as proposed', async () => {
    await insertProposal({
      id: 300,
      stage: ProposalStage.Executed,
      dequeuedAt: daysAgo(5),
      executedAt: '2026-10-20T09:15:00.000Z',
    });

    await reconcileGovernanceRepoStatus(NOW);

    expect(mockFetchStatus).toHaveBeenCalledWith(300);
    expect(reportedUpdates()).toEqual([
      expect.objectContaining({
        cgpNumber: 300,
        onchainId: 300,
        status: ProposalMetadataStatus.EXECUTED,
        executedAt: expect.stringMatching(/^2026-10-20/),
      }),
    ]);
  });

  it('skips a proposal whose status the governance repo already has', async () => {
    await insertProposal({
      id: 301,
      stage: ProposalStage.Executed,
      dequeuedAt: daysAgo(5),
      executedAt: daysAgo(2),
    });
    mockFetchStatus.mockResolvedValue(ProposalMetadataStatus.EXECUTED);

    await reconcileGovernanceRepoStatus(NOW);

    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('reports expired and rejected proposals once the execution window has settled', async () => {
    await insertProposal({ id: 310, stage: ProposalStage.Expiration, dequeuedAt: daysAgo(11) });
    await insertProposal({ id: 311, stage: ProposalStage.Rejected, dequeuedAt: daysAgo(11) });
    // Ten days plus one hour: the execution window closed too recently to trust
    await insertProposal({ id: 312, stage: ProposalStage.Expiration, dequeuedAt: daysAgo(10, 1) });

    await reconcileGovernanceRepoStatus(NOW);

    expect(reportedUpdates()).toHaveLength(2);
    expect(reportedUpdates()).toEqual(
      expect.arrayContaining([
        { cgpNumber: 310, onchainId: 310, status: ProposalMetadataStatus.EXPIRED },
        { cgpNumber: 311, onchainId: 311, status: ProposalMetadataStatus.REJECTED },
      ]),
    );
  });

  it('never overwrites a status the governance repo has as executed', async () => {
    await insertProposal({ id: 320, stage: ProposalStage.Expiration, dequeuedAt: daysAgo(11) });
    mockFetchStatus.mockResolvedValue(ProposalMetadataStatus.EXECUTED);

    await reconcileGovernanceRepoStatus(NOW);

    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('leaves out unreadable files, old proposals and staging test data', async () => {
    await insertProposal({ id: 330, stage: ProposalStage.Expiration, dequeuedAt: daysAgo(40) });
    await insertProposal({
      id: 1001,
      stage: ProposalStage.Executed,
      dequeuedAt: daysAgo(3),
      executedAt: daysAgo(1),
    });
    await insertProposal({
      id: 340,
      stage: ProposalStage.Executed,
      dequeuedAt: daysAgo(3),
      executedAt: daysAgo(1),
    });
    mockFetchStatus.mockResolvedValue(null);

    await reconcileGovernanceRepoStatus(NOW);

    expect(mockFetchStatus).toHaveBeenCalledTimes(1);
    expect(mockFetchStatus).toHaveBeenCalledWith(340);
    expect(mockTrigger).not.toHaveBeenCalled();
  });
});
