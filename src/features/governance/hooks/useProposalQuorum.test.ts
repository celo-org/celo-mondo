import * as rq from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { afterEach, beforeEach } from 'node:test';
import { publicArchiveClient } from 'src/test/anvil/utils';
import { describe, expect, it, vi } from 'vitest';
import * as module from './useProposalQuorum';

beforeEach(() => {
  vi.mock('wagmi', async (importActual) => ({
    ...(await importActual()),
    usePublicClient: () => publicArchiveClient,
    useReadContract: vi.fn(() => ({
      data: [
        60000000000000000000000n, // baseline
        50000000000000000000000n, // baselineFloor
        200000000000000000000000n, // baselineUpdateFactor
        500000000000000000000000n, // baselineQuorumFactor
      ],
    })),
  }));
  vi.mock('@tanstack/react-query', async (importActual) => ({
    ...(await importActual()),
    useQuery: vi.fn(({ data, error, isLoading }) => ({
      isLoading: false,
      isError: !error,
      error,
      data,
    })),
  }));
  vi.mock('src/components/notifications/useToastError', async (importActual) => ({
    ...(await importActual()),
    useToastError: () => {},
  }));
  vi.mock('src/features/governance/hooks/useProposalQuorum', async (importActual) => ({
    ...(await importActual()),
    useThresholds: vi.fn((data) => data),
    useParticipationParameters: vi.fn((data) => data),
  }));
  vi.mock('react', async (importActual) => ({
    ...(await importActual()),
    useMemo: vi.fn((x) => x()),
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('extractFunctionSignature', () => {
  it('gets the four first bytes of a byte array', () => {
    expect(module.extractFunctionSignature('0x112233445566778899')).toBe('0x11223344');
    expect(module.extractFunctionSignature('1234567890' as `0x${string}`)).toBe('0x12345678');
  });
});

describe('fetchThresholds', () => {
  it('fetches the constitution threshholds properly #2', async () => {
    // Proposal for Creation of Celo Governance Guild's execution block - 1
    process.env.NEXT_PUBLIC_FORK_BLOCK_NUMBER = '0x1bb55ea';
    const expectedNumberOfTxs = 1n;
    const proposalId = 195;
    const spy = vi.spyOn(publicArchiveClient, 'multicall');
    await expect(
      module.fetchThresholds(publicArchiveClient, proposalId, expectedNumberOfTxs),
    ).resolves.toMatchSnapshot();
    expect(spy.mock.results[0].value).resolves.toHaveLength(Number(expectedNumberOfTxs));
    expect(spy.mock.calls.length).toBe(2);
  });

  it('fetches the constitution threshholds properly #2', async () => {
    // Enabling MENTO Governance's proposal block
    process.env.NEXT_PUBLIC_FORK_BLOCK_NUMBER = '0x1baa98c';
    const expectedNumberOfTxs = 50n;
    const proposalId = 196;
    const spy = vi.spyOn(publicArchiveClient, 'multicall');
    await expect(
      module.fetchThresholds(publicArchiveClient, proposalId, expectedNumberOfTxs),
    ).resolves.toMatchSnapshot();
    expect(spy.mock.results[0].value).resolves.toHaveLength(Number(expectedNumberOfTxs));
    expect(spy.mock.calls.length).toBe(2);
  });
});

describe('useParticipationParameters', () => {
  it('fetches the params from the governance contract', async () => {
    expect(module.useParticipationParameters()).toMatchInlineSnapshot(`
      {
        "baseline": 0.06,
        "baselineFloor": 0.05,
        "baselineQuorumFactor": 0.5,
        "baselineUpdateFactor": 0.2,
      }
    `);
  });
});

describe('useProposalQuorum', () => {
  it('maths properly', () => {
    const baseline = 0.06;
    const baselineQuorumFactor = 0.5;
    vi.spyOn(module, 'useParticipationParameters').mockReturnValue({
      baseline,
      baselineFloor: 0.05,
      baselineUpdateFactor: 0.2,
      baselineQuorumFactor,
    });
    // @ts-expect-error
    vi.spyOn(rq, 'useQuery').mockReturnValue({ data: [0.75, 0.1, 0.5] });
    const networkWeight = 200000000000000000000000000n;

    const quorumPct = baseline * baselineQuorumFactor;
    const quorumVotes = new BigNumber(networkWeight.toString()).times(quorumPct);
    const maxThreshold = quorumVotes.times(0.75 /* highest mocked threshold */);
    expect(
      // @ts-expect-error
      module.useProposalQuorum({ proposal: { id: 1, numTransactions: 3, networkWeight } }),
    ).toBe(BigInt(maxThreshold.toFixed(0)));
    expect(BigInt(maxThreshold.toFixed(0))).toMatchInlineSnapshot(`4500000000000000000000000n`);
  });
});
