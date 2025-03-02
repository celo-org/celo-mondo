import { afterEach, beforeEach } from 'node:test';
import { TransactionLog } from 'src/features/explorers/types';
import { publicClient } from 'src/test/anvil/utils';
import { logger } from 'src/utils/logger';
import { afterAll, describe, expect, it, test, vi } from 'vitest';
import { Proposal, ProposalMetadata, ProposalStage } from '../types';
import {
  MergedProposalData,
  fetchExecutedProposalIds,
  fetchGovernanceMetadata,
  fetchGovernanceProposals,
  getExpiryTimestamp,
  mergeProposalsWithMetadata,
  pessimisticallyHandleMismatchedIDs,
  useGovernanceProposal,
} from './useGovernanceProposals';

beforeEach(() => {
  vi.mock('wagmi', async (importActual) => ({
    ...(await importActual()),
    usePublicClient: () => publicClient,
  }));

  vi.mock('src/components/notifications/useToastError', async (importActual) => ({
    ...(await importActual()),
    useToastError: () => {},
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useGovernanceProposal', () => {
  it('finds the correct proposal', async () => {
    vi.mock('@tanstack/react-query', async (importActual) => ({
      ...(await importActual()),
      useQuery: () => ({
        isLoading: false,
        isError: false,
        error: null,
        data: [
          { id: 1, stage: ProposalStage.Execution, metadata: { title: 'test proposal 1' } },
          { id: 2, stage: ProposalStage.Executed, metadata: { title: 'test proposal 2' } },
          { id: 3, stage: ProposalStage.Expiration, metadata: { title: 'test proposal 3' } },
          { id: 4, stage: ProposalStage.Rejected, metadata: { title: 'test proposal 4' } },
        ] as MergedProposalData[],
      }),
    }));

    expect(useGovernanceProposal()?.id).toBeUndefined();
    expect(useGovernanceProposal(42)?.id).toBeUndefined();
    expect(useGovernanceProposal(2)?.stage).toBe(ProposalStage.Executed);
  });
});

describe('fetchExecutedProposalIds', () => {
  afterAll(() => {
    vi.mock('src/features/explorers/celoscan', async (importActual) => ({
      ...(await importActual()),
    }));
  });

  it('maps celoscan events to proposal ids', async () => {
    vi.mock('src/features/explorers/celoscan', async (importActual) => ({
      ...(await importActual()),
      queryCeloscanLogs: () =>
        Promise.resolve([
          { topics: [`0x`, `0x1`] },
          { topics: [`0x`, `0x2`] },
          { topics: [`0x`, `0x3`] },
          { topics: [`0x`, `0x10`] },
        ] as unknown as TransactionLog[]),
    }));
    expect(fetchExecutedProposalIds()).resolves.toMatchInlineSnapshot(`
      [
        1,
        2,
        3,
        16,
      ]
    `);
  });
});

describe('fetchGovernanceMetadata', () => {
  test('parses the json cache', async () => {
    // we're not really interesting by debug logs here and we are testing the
    // parsing functionality in `fetchFromRepository.test.ts`
    vi.spyOn(logger, 'debug').mockImplementation(() => {});

    (await fetchGovernanceMetadata()).forEach((cachedProposalFromRepo) => {
      expect(cachedProposalFromRepo).toHaveProperty('stage');
      expect(cachedProposalFromRepo).toHaveProperty('cgp');
      expect(cachedProposalFromRepo).toHaveProperty('cgpUrl');
      expect(cachedProposalFromRepo).toHaveProperty('cgpUrlRaw');
      expect(cachedProposalFromRepo).toHaveProperty('title');
      expect(cachedProposalFromRepo).toHaveProperty('author');
    });
  });
});

describe('getExpiryTimestamp', () => {
  test('Approval', () => {
    expect(getExpiryTimestamp(ProposalStage.Approval, 1000)).toMatchInlineSnapshot(`86401000`);
  });
  test('Queued', () => {
    expect(getExpiryTimestamp(ProposalStage.Queued, 1000)).toMatchInlineSnapshot(`2419201000`);
  });
  test('Referendum', () => {
    expect(getExpiryTimestamp(ProposalStage.Referendum, 1000)).toMatchInlineSnapshot(`604801000`);
  });
  test('Execution', () => {
    expect(getExpiryTimestamp(ProposalStage.Execution, 1000)).toMatchInlineSnapshot(`864001000`);
  });
  test('Others', () => {
    [
      ProposalStage.None,
      ProposalStage.Expiration,
      ProposalStage.Rejected,
      ProposalStage.Withdrawn,
      ProposalStage.Executed,
    ].forEach((stage) => {
      expect(getExpiryTimestamp(stage, 1000)).toBeUndefined();
    });
  });
});

describe('fetchGovernanceProposals', () => {
  // Know block, mento proposal creation, for abritary reasons
  process.env.NEXT_PUBLIC_FORK_BLOCK_NUMBER = '0x1baa98c';
  test('fetched queued and dequeued proposals', async () => {
    const proposals = await fetchGovernanceProposals(publicClient);
    expect(proposals).toMatchSnapshot();
  });
}, 15_000);

describe('mergeProposalsWithMetadata', () => {
  test('merge properly', async () => {
    // make sure we used cached data for tests
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
      throw new Error('Test error: 403 rate limit exceeded');
    });
    // Know block, mento proposal creation, for abritary reasons
    process.env.NEXT_PUBLIC_FORK_BLOCK_NUMBER = '0x1baa98c';
    // This is almost and E2E test, so not sure about that. fix the github rate limit
    const [ids, proposalsChain, proposalsGH] = await Promise.all([
      fetchExecutedProposalIds(),
      fetchGovernanceProposals(publicClient),
      fetchGovernanceMetadata(),
    ]);

    const merged = mergeProposalsWithMetadata(proposalsChain, proposalsGH, ids);
    expect(merged.length).toBe((await import('src/config/proposals.json')).default.length);
    merged.forEach((proposal) => {
      if (proposal.id === 196) {
        // mento
        expect(proposal.stage).toBe(ProposalStage.Queued);
      } else if (proposal.id === 195) {
        // gvt guild
        expect(proposal.stage).toBe(ProposalStage.Referendum);
      } else if (proposal.metadata?.cgp === 149) {
        // draft
        expect(proposal.stage).toBe(ProposalStage.Executed);
      } else if (proposal.metadata?.cgp === 163) {
        expect(proposal.stage).toBe(ProposalStage.Executed);
      }
    });
  });
}, 10000);

describe('pessimisticallyHandleMismatchedIDs', () => {
  const executedIDS = [1, 3, 5, 7, 11, 21, 99, 101];
  const metdataCommon = {
    cgpUrl: 'https://github.com/celo-org/governance/blob/main/CGPs/cgp-0101.md',
    cgpUrlRaw: 'https://raw.githubusercontent.com/celo-org/governance/main/CGPs/cgp-0101.md',
    title: 'test proposal',
    author: 'test author',
    votes: undefined,
  } as const;

  const proposalMap = new Map<number, Proposal>();

  proposalMap.set(212, {
    id: 212,
    stage: 3,
    timestamp: 1740839940000,
    expiryTimestamp: 1741444740000,
    proposer: '0xFEF5A1A2b3754A2F53161EaaAcb3EB889F004d4a',
    deposit: 10000000000000000000000n,
    numTransactions: 2n,
    networkWeight: 0n,
    isApproved: false,
    url: 'https://github.com/celo-org/governance/blob/main/CGPs/cgp-0165.md',
    upvotes: 0n,
    votes: {
      yes: 0n,
      no: 0n,
      abstain: 0n,
    },
  });

  // values not used in test
  const proposalCommon = {
    timestamp: Date.now(),
    url: 'https://github.com/celo-org/governance/blob/main/CGPs/cgp-0101.md',
    deposit: 100000000000000000000n,
    numTransactions: 2n,
    proposer: '0x1234567890123456789012345678901234567890',
    networkWeight: 100000000000000000000n,
    votes: {
      yes: 1000000000000000000000n,
      no: 1000000000000000000000n,
      abstain: 1000000000000000000000n,
    },
    upvotes: 1000000000000000000000n,
  } as const;

  describe('when on chain proposal id has been executed', () => {
    it('returns with proposal as truth', () => {
      const executedID = executedIDS[0];
      const nonExecutedId = 4;
      expect(executedIDS.includes(nonExecutedId)).toBe(false);
      const proposal: Proposal = {
        id: executedID,
        stage: ProposalStage.Executed,
        ...proposalCommon,
        isApproved: true,
      };
      const metadata: ProposalMetadata = {
        id: nonExecutedId,
        stage: ProposalStage.Queued,
        cgp: 101,
        ...metdataCommon,
      };
      expect(
        pessimisticallyHandleMismatchedIDs(executedIDS, metadata, proposal, proposalMap),
      ).toEqual({
        id: executedID,
        metadata: { ...metadata, id: executedID },
        stage: ProposalStage.Executed,
        proposal,
      });
    });
  });
  describe('when id from github metadata has been executed', () => {
    it('returns metadata as truth', () => {
      const executedID = executedIDS[3];
      const nonExecutedId = 22;
      expect(executedIDS.includes(nonExecutedId)).toBe(false);
      const proposal: Proposal = {
        id: nonExecutedId,
        stage: ProposalStage.Expiration,
        ...proposalCommon,
        isApproved: true,
      };
      const metadata: ProposalMetadata = {
        id: executedID,
        stage: ProposalStage.Queued,
        cgp: 101,
        ...metdataCommon,
      };
      expect(
        pessimisticallyHandleMismatchedIDs(executedIDS, metadata, proposal, proposalMap),
      ).toEqual({
        id: executedID,
        stage: ProposalStage.Executed,
        metadata: metadata,
      });
    });
  });
  // realistcally this should never happen so not bothering with it for now
  describe.todo('when both id has been executed', () => {
    it('returns with higher as truth', () => {});
  });
  describe('when on chain is expired and gh hub stage is withdrawn/rejected', () => {
    it('returns with x as truth  and uses metadata for status', () => {
      const proposal: Proposal = {
        id: 4,
        stage: ProposalStage.Expiration,
        ...proposalCommon,
        isApproved: true,
      };
      const metadata: ProposalMetadata = {
        id: 62,
        stage: ProposalStage.Rejected,
        cgp: 101,
        ...metdataCommon,
      };
      expect(
        pessimisticallyHandleMismatchedIDs(executedIDS, metadata, proposal, proposalMap),
      ).toEqual({
        id: 62,
        metadata: { ...metadata, votes: undefined },
        stage: metadata.stage,
        proposal,
      });
    });
  });
  describe('when neither id has been executed', () => {
    const proposal: Proposal = {
      id: 212,
      stage: 3,
      timestamp: 1740839940000,
      expiryTimestamp: 1741444740000,
      proposer: '0xFEF5A1A2b3754A2F53161EaaAcb3EB889F004d4a',
      deposit: 10000000000000000000000n,
      numTransactions: 2n,
      networkWeight: 0n,
      isApproved: false,
      url: 'https://github.com/celo-org/governance/blob/main/CGPs/cgp-0165.md',
      upvotes: 0n,
      votes: {
        yes: 0n,
        no: 0n,
        abstain: 0n,
      },
    };
    const metadata: ProposalMetadata = {
      cgp: 165,
      cgpUrl: 'https://github.com/celo-org/governance/blob/main/CGPs/cgp-0165.md',
      cgpUrlRaw: 'https://raw.githubusercontent.com/celo-org/governance/main/CGPs/cgp-0165.md',
      title: 'Celo Communities Guild Proposal 2025 H1 Budget',
      author:
        'Celo communities Guild: 0xj4an-work (@0xj4an-work), Goldo (@0xGoldo), Anthony (@0xKnight)',
      stage: 1,
      id: 207,
      url: 'https://forum.celo.org/t/celo-communities-guild-proposal-2025-h1-budget',
      timestamp: 1739491200000,
    };
    it('returns the higher one (on the assumption that new is probably correct', () => {
      expect(
        pessimisticallyHandleMismatchedIDs(executedIDS, metadata, proposal, proposalMap),
      ).toEqual({
        id: 212,
        metadata: { ...metadata, id: 212, stage: 3 },
        stage: 3,
        proposal,
      });
    });
  });
});
