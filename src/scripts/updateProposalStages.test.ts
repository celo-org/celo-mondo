import { eq } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { TEST_CHAIN_ID } from 'src/test/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateProposalStages } from './updateProposalStages';

// Mock getOnChainQuorumRequired since it makes complex RPC calls
const mockGetOnChainQuorumRequired = vi.fn().mockResolvedValue({ quorumVotesRequired: 100n });
vi.mock('src/features/governance/utils/quorum', () => ({
  getOnChainQuorumRequired: (...args: unknown[]) => mockGetOnChainQuorumRequired(...args),
}));

function createMockClient(getProposalStageResponses: Record<number, ProposalStage>) {
  return {
    chain: { id: TEST_CHAIN_ID },
    readContract: vi.fn().mockImplementation(({ args }: { args: [bigint] }) => {
      const proposalId = Number(args[0]);
      const stage = getProposalStageResponses[proposalId];
      if (stage === undefined) {
        throw new Error(`No mock response for proposal ${proposalId}`);
      }
      return Promise.resolve(stage);
    }),
  } as any;
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

function insertProposalExecutedEvent(proposalId: number) {
  // Use proposalId to generate a unique tx hash (PK includes eventName + txHash + chainId)
  const txHash = `0x${proposalId.toString(16).padStart(64, '0')}` as `0x${string}`;
  return database.insert(eventsTable).values({
    chainId: TEST_CHAIN_ID,
    eventName: 'ProposalExecuted',
    args: { proposalId: String(proposalId) },
    address: '0x0000000000000000000000000000000000000000',
    topics: ['0xabc123' as `0x${string}`, txHash],
    data: '0x' as `0x${string}`,
    blockNumber: 59165954n,
    transactionHash: txHash,
  });
}

async function getProposalStage(proposalId: number): Promise<ProposalStage> {
  const [row] = await database
    .select({ stage: proposalsTable.stage })
    .from(proposalsTable)
    .where(eq(proposalsTable.id, proposalId));
  return row.stage;
}

describe('updateProposalStages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('self-heals: Expiration → Executed when ProposalExecuted event exists', async () => {
    // Proposal is stuck as Expiration in DB (the bug scenario)
    await insertProposal({ id: 275, stage: ProposalStage.Expiration, transactionCount: 3 });
    // But a ProposalExecuted event exists in the events table
    await insertProposalExecutedEvent(275);

    // On-chain returns Expiration (5) because data was zeroed after execution
    const client = createMockClient({ 275: ProposalStage.Expiration });

    await updateProposalStages(client);

    expect(await getProposalStage(275)).toBe(ProposalStage.Executed);
  });

  it('prevents: Execution → Executed (not Expiration) when ProposalExecuted event exists', async () => {
    // Proposal is in Execution stage, just got executed on-chain
    await insertProposal({ id: 100, stage: ProposalStage.Execution, transactionCount: 2 });
    await insertProposalExecutedEvent(100);

    // Contract returns Expiration because data was zeroed
    const client = createMockClient({ 100: ProposalStage.Expiration });

    await updateProposalStages(client);

    expect(await getProposalStage(100)).toBe(ProposalStage.Executed);
  });

  it('marks genuine expiration when no ProposalExecuted event exists', async () => {
    await insertProposal({ id: 50, stage: ProposalStage.Execution, transactionCount: 1 });

    // Contract returns Expiration and there's no ProposalExecuted event
    const client = createMockClient({ 50: ProposalStage.Expiration });

    await updateProposalStages(client);

    expect(await getProposalStage(50)).toBe(ProposalStage.Expiration);
  });

  it('marks as Rejected when expired with more No votes than Yes', async () => {
    await insertProposal({ id: 60, stage: ProposalStage.Execution, transactionCount: 1 });

    // Insert votes: more No than Yes
    await database.insert((await import('src/db/schema')).votesTable).values([
      { proposalId: 60, type: VoteType.Yes, count: 10n, chainId: TEST_CHAIN_ID },
      { proposalId: 60, type: VoteType.No, count: 20n, chainId: TEST_CHAIN_ID },
    ]);

    const client = createMockClient({ 60: ProposalStage.Expiration });

    await updateProposalStages(client);

    expect(await getProposalStage(60)).toBe(ProposalStage.Rejected);
  });

  it('does not update when on-chain stage matches DB stage', async () => {
    await insertProposal({ id: 70, stage: ProposalStage.Referendum });

    // On-chain confirms same stage
    const client = createMockClient({ 70: ProposalStage.Referendum });

    await updateProposalStages(client);

    expect(await getProposalStage(70)).toBe(ProposalStage.Referendum);
  });

  it('marks zero-transaction proposals as Adopted when leaving Execution', async () => {
    await insertProposal({ id: 80, stage: ProposalStage.Execution, transactionCount: 0 });

    // Contract returns Expiration, no executed event, zero txns → Adopted
    const client = createMockClient({ 80: ProposalStage.Expiration });

    await updateProposalStages(client);

    expect(await getProposalStage(80)).toBe(ProposalStage.Adopted);
  });

  it('does not touch proposals in non-active stages (e.g. Executed, Queued)', async () => {
    await insertProposal({ id: 90, stage: ProposalStage.Executed });
    await insertProposal({ id: 91, stage: ProposalStage.Queued });

    const client = createMockClient({});

    await updateProposalStages(client);

    // readContract should never be called since these proposals are filtered out
    expect(client.readContract).not.toHaveBeenCalled();
    expect(await getProposalStage(90)).toBe(ProposalStage.Executed);
    expect(await getProposalStage(91)).toBe(ProposalStage.Queued);
  });

  describe('headClient fallback (stale archive node)', () => {
    it('uses headClient for getProposalStage when provided', async () => {
      await insertProposal({ id: 300, stage: ProposalStage.Referendum });

      // Archive node is stale — still returns Referendum
      const archiveClient = createMockClient({ 300: ProposalStage.Referendum });
      // Head client (forno) returns the correct current stage
      const headClient = createMockClient({ 300: ProposalStage.Execution });

      await updateProposalStages(archiveClient, headClient);

      // Stage should update based on headClient's response
      expect(await getProposalStage(300)).toBe(ProposalStage.Execution);
      // headClient was used for getProposalStage
      expect(headClient.readContract).toHaveBeenCalled();
      // archiveClient was NOT used for getProposalStage (only for quorum via mock)
      expect(archiveClient.readContract).not.toHaveBeenCalled();
    });

    it('still updates stage when quorum calculation fails (archive node stale)', async () => {
      await insertProposal({ id: 310, stage: ProposalStage.Referendum });

      const archiveClient = createMockClient({ 310: ProposalStage.Referendum });
      const headClient = createMockClient({ 310: ProposalStage.Execution });

      // Simulate archive node failing on historical reads
      mockGetOnChainQuorumRequired.mockRejectedValueOnce(
        new Error('historical state is not available'),
      );

      await updateProposalStages(archiveClient, headClient);

      // Stage should still update even though quorum failed
      expect(await getProposalStage(310)).toBe(ProposalStage.Execution);
    });

    it('updates stage without quorumVotesRequired when quorum fails', async () => {
      await insertProposal({
        id: 320,
        stage: ProposalStage.Referendum,
        quorumVotesRequired: 50n,
      });

      const archiveClient = createMockClient({ 320: ProposalStage.Referendum });
      const headClient = createMockClient({ 320: ProposalStage.Execution });

      mockGetOnChainQuorumRequired.mockRejectedValueOnce(
        new Error('historical state is not available'),
      );

      await updateProposalStages(archiveClient, headClient);

      // Stage updated, but quorumVotesRequired preserved from before (not overwritten)
      const [row] = await database
        .select({ stage: proposalsTable.stage, quorum: proposalsTable.quorumVotesRequired })
        .from(proposalsTable)
        .where(eq(proposalsTable.id, 320));
      expect(row.stage).toBe(ProposalStage.Execution);
      expect(row.quorum).toBe(50n);
    });

    it('falls back to main client when headClient is not provided', async () => {
      await insertProposal({ id: 330, stage: ProposalStage.Referendum });

      const client = createMockClient({ 330: ProposalStage.Execution });

      await updateProposalStages(client);

      expect(await getProposalStage(330)).toBe(ProposalStage.Execution);
      expect(client.readContract).toHaveBeenCalled();
    });
  });

  it('self-heals multiple proposals in a single run', async () => {
    await insertProposal({ id: 200, stage: ProposalStage.Expiration, transactionCount: 1 });
    await insertProposal({ id: 201, stage: ProposalStage.Expiration, transactionCount: 2 });
    await insertProposalExecutedEvent(200);
    await insertProposalExecutedEvent(201);

    const client = createMockClient({
      200: ProposalStage.Expiration,
      201: ProposalStage.Expiration,
    });

    await updateProposalStages(client);

    expect(await getProposalStage(200)).toBe(ProposalStage.Executed);
    expect(await getProposalStage(201)).toBe(ProposalStage.Executed);
  });
});
