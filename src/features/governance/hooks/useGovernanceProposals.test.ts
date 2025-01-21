import { afterEach, beforeEach } from 'node:test';
import { TransactionLog } from 'src/features/explorers/types';
import { publicClient } from 'src/test/anvil/utils';
import { logger } from 'src/utils/logger';
import { afterAll, describe, expect, it, test, vi } from 'vitest';
import { ProposalStage } from '../types';
import {
  MergedProposalData,
  fetchExecutedProposalIds,
  fetchGovernanceMetadata,
  fetchGovernanceProposals,
  getExpiryTimestamp,
  mergeProposalsWithMetadata,
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
      }
    });
  });
}, 10000);
