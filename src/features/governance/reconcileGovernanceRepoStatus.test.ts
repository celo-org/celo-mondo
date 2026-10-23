import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { ProposalMetadataStatus, ProposalStage } from 'src/features/governance/types';
import { TEST_CHAIN_ID } from 'src/test/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reconcileGovernanceRepoStatus } from './reconcileGovernanceRepoStatus';

const { mockFetchStatus, mockTrigger, mockReadContract, mockGetBlock } = vi.hoisted(() => ({
  mockFetchStatus: vi.fn(),
  mockTrigger: vi.fn(),
  mockReadContract: vi.fn(),
  mockGetBlock: vi.fn(),
}));

vi.mock('src/features/governance/syncGovernanceRepoStatus', () => ({
  fetchGovernanceRepoStatus: mockFetchStatus,
  triggerGovernanceRepoStatusUpdate: mockTrigger,
}));

vi.mock('src/utils/client', () => ({
  celoPublicClient: { readContract: mockReadContract, getBlock: mockGetBlock },
}));

const NOW = new Date('2026-10-23T12:00:00.000Z');
const CGP_URL = (cgp: number) =>
  `https://github.com/celo-org/governance/blob/main/CGPs/cgp-${String(cgp).padStart(4, '0')}.md`;

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

function insertProposalExecutedEvent(proposalId: number, blockNumber: bigint) {
  const txHash = `0x${proposalId.toString(16).padStart(64, '0')}` as `0x${string}`;
  return database.insert(eventsTable).values({
    chainId: TEST_CHAIN_ID,
    eventName: 'ProposalExecuted',
    args: { proposalId: String(proposalId) },
    address: '0x0000000000000000000000000000000000000000',
    topics: ['0xabc123' as `0x${string}`, txHash],
    data: '0x' as `0x${string}`,
    blockNumber,
    transactionHash: txHash,
    logIndex: 0,
  });
}

/** Chain state: queued/dequeued proposal ids and the CGP each description URL names. */
function mockChain(liveProposals: Record<number, number>) {
  mockReadContract.mockImplementation(({ functionName, args }) => {
    const ids = Object.keys(liveProposals).map(BigInt);
    if (functionName === 'getQueue') return Promise.resolve([[], []]);
    if (functionName === 'getDequeue') return Promise.resolve(ids);
    if (functionName === 'getProposal') {
      const cgp = liveProposals[Number(args[0])];
      return Promise.resolve(['0x0', 0n, 0n, 0n, CGP_URL(cgp), 0n, false]);
    }
    throw new Error(`unexpected read ${functionName}`);
  });
}

function governanceSays(status: ProposalMetadataStatus, proposalId: number | null = null) {
  mockFetchStatus.mockResolvedValue({ status, proposalId });
}

function reportedUpdates() {
  return mockTrigger.mock.calls.map(([update]) => update);
}

describe('reconcileGovernanceRepoStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    governanceSays(ProposalMetadataStatus.PROPOSED);
    mockTrigger.mockResolvedValue(undefined);
    mockChain({});
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
    governanceSays(ProposalMetadataStatus.EXECUTED, 301);

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
    governanceSays(ProposalMetadataStatus.EXECUTED, 320);

    await reconcileGovernanceRepoStatus(NOW);

    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('reports only the current attempt of a resubmitted CGP', async () => {
    // CGP 140: first attempt expired, resubmission executed
    await insertProposal({
      id: 350,
      cgp: 140,
      stage: ProposalStage.Expiration,
      dequeuedAt: daysAgo(25),
    });
    await insertProposal({
      id: 351,
      cgp: 140,
      pastId: 350,
      stage: ProposalStage.Executed,
      dequeuedAt: daysAgo(5),
      executedAt: daysAgo(2),
    });
    // CGP 150: first attempt expired, resubmission still in referendum
    await insertProposal({
      id: 360,
      cgp: 150,
      stage: ProposalStage.Expiration,
      dequeuedAt: daysAgo(25),
    });
    await insertProposal({
      id: 361,
      cgp: 150,
      pastId: 360,
      stage: ProposalStage.Referendum,
      dequeuedAt: daysAgo(3),
    });

    await reconcileGovernanceRepoStatus(NOW);

    expect(reportedUpdates()).toEqual([
      expect.objectContaining({
        cgpNumber: 140,
        onchainId: 351,
        status: ProposalMetadataStatus.EXECUTED,
      }),
    ]);
  });

  it('skips an attempt the chain has already superseded but the backfill has not imported', async () => {
    await insertProposal({
      id: 370,
      cgp: 160,
      stage: ProposalStage.Expiration,
      dequeuedAt: daysAgo(11),
    });
    await insertProposal({
      id: 372,
      cgp: 161,
      stage: ProposalStage.Expiration,
      dequeuedAt: daysAgo(11),
    });
    // 371 resubmits CGP 160 and sits in the dequeue; 373 is an unrelated newer proposal
    mockChain({ 371: 160, 373: 999 });

    await reconcileGovernanceRepoStatus(NOW);

    expect(reportedUpdates()).toEqual([
      { cgpNumber: 161, onchainId: 372, status: ProposalMetadataStatus.EXPIRED },
    ]);
  });

  it('skips an attempt the governance repo has already moved past', async () => {
    await insertProposal({
      id: 380,
      cgp: 170,
      stage: ProposalStage.Rejected,
      dequeuedAt: daysAgo(11),
    });
    governanceSays(ProposalMetadataStatus.PROPOSED, 381);

    await reconcileGovernanceRepoStatus(NOW);

    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('derives the execution date from the event when the row lacks it', async () => {
    await insertProposal({ id: 390, stage: ProposalStage.Executed, dequeuedAt: daysAgo(5) });
    await insertProposalExecutedEvent(390, 80_000_000n);
    mockGetBlock.mockResolvedValue({ timestamp: 1_760_000_000n });

    await reconcileGovernanceRepoStatus(NOW);

    expect(mockGetBlock).toHaveBeenCalledWith({ blockNumber: 80_000_000n });
    expect(reportedUpdates()).toEqual([
      expect.objectContaining({
        onchainId: 390,
        status: ProposalMetadataStatus.EXECUTED,
        executedAt: expect.stringMatching(/^2025-10-09/),
      }),
    ]);
  });

  it('leaves out unreadable files and old proposals', async () => {
    await insertProposal({ id: 330, stage: ProposalStage.Expiration, dequeuedAt: daysAgo(40) });
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
