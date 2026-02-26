import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { ProposalStage } from 'src/features/governance/types';
import { TEST_CHAIN_ID } from 'src/test/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { selfHealOrphanedProposals } from 'src/features/governance/selfHealOrphanedProposals';

vi.mock('src/features/governance/updateProposalsInDB', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

function createMockClient() {
  return {
    chain: { id: TEST_CHAIN_ID },
  } as any;
}

function insertProposal(id: number) {
  return database.insert(proposalsTable).values({
    id,
    chainId: TEST_CHAIN_ID,
    cgp: id,
    author: 'test',
    title: `Proposal ${id}`,
    stage: ProposalStage.Referendum,
    timestamp: 1753277605,
  });
}

let eventCounter = 0;
function insertEvent(
  proposalId: number,
  eventName: (typeof eventsTable.$inferInsert)['eventName'],
) {
  eventCounter++;
  const txHash =
    `0x${(proposalId * 1000 + eventCounter).toString(16).padStart(64, '0')}` as `0x${string}`;
  return database.insert(eventsTable).values({
    chainId: TEST_CHAIN_ID,
    eventName,
    args: { proposalId: String(proposalId) },
    address: '0x0000000000000000000000000000000000000000',
    topics: ['0xabc123' as `0x${string}`, txHash],
    data: '0x' as `0x${string}`,
    blockNumber: 59165954n,
    transactionHash: txHash,
  });
}

describe('selfHealOrphanedProposals', () => {
  let updateProposalsInDB: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('src/features/governance/updateProposalsInDB');
    updateProposalsInDB = mod.default as ReturnType<typeof vi.fn>;
  });

  it('detects orphaned proposals (events without proposal rows)', async () => {
    // Proposal 100 has a row — not orphaned
    await insertProposal(100);
    await insertEvent(100, 'ProposalQueued');

    // Proposal 283 has events but NO proposal row — orphaned
    await insertEvent(283, 'ProposalQueued');
    await insertEvent(283, 'ProposalDequeued');

    const client = createMockClient();
    const result = await selfHealOrphanedProposals(client);

    expect(result).toEqual([283n]);
    expect(updateProposalsInDB).toHaveBeenCalledWith(client, [283n], 'update');
  });

  it('detects multiple orphaned proposals', async () => {
    await insertEvent(200, 'ProposalQueued');
    await insertEvent(201, 'ProposalApproved');
    await insertEvent(202, 'ProposalExecuted');

    const client = createMockClient();
    const result = await selfHealOrphanedProposals(client);

    expect(result).toHaveLength(3);
    expect(result.map(Number).sort()).toEqual([200, 201, 202]);
    expect(updateProposalsInDB).toHaveBeenCalledOnce();
  });

  it('returns empty array when no orphans exist', async () => {
    await insertProposal(100);
    await insertEvent(100, 'ProposalQueued');

    const client = createMockClient();
    const result = await selfHealOrphanedProposals(client);

    expect(result).toEqual([]);
    expect(updateProposalsInDB).not.toHaveBeenCalled();
  });

  it('returns empty array when no events exist at all', async () => {
    const client = createMockClient();
    const result = await selfHealOrphanedProposals(client);

    expect(result).toEqual([]);
    expect(updateProposalsInDB).not.toHaveBeenCalled();
  });

  it('ignores vote events (only governance lifecycle events are considered)', async () => {
    // Only vote events exist for proposal 300 — should NOT be treated as orphaned
    await insertEvent(300, 'ProposalVotedV2');
    await insertEvent(300, 'ProposalUpvoted');

    const client = createMockClient();
    const result = await selfHealOrphanedProposals(client);

    expect(result).toEqual([]);
    expect(updateProposalsInDB).not.toHaveBeenCalled();
  });

  it('skips proposals with id <= 149 (legacy proposals without metadata)', async () => {
    await insertEvent(50, 'ProposalQueued');
    await insertEvent(149, 'ProposalApproved');

    const client = createMockClient();
    const result = await selfHealOrphanedProposals(client);

    expect(result).toEqual([]);
    expect(updateProposalsInDB).not.toHaveBeenCalled();
  });

  it('deduplicates proposals with multiple event types', async () => {
    // Proposal 283 has multiple lifecycle events — should only appear once
    await insertEvent(283, 'ProposalQueued');
    await insertEvent(283, 'ProposalDequeued');
    await insertEvent(283, 'ProposalApproved');

    const client = createMockClient();
    const result = await selfHealOrphanedProposals(client);

    expect(result).toEqual([283n]);
    expect(updateProposalsInDB).toHaveBeenCalledWith(client, [283n], 'update');
  });
});
