import { afterEach, beforeEach } from 'node:test';
import { publicClient } from 'src/test/anvil/utils';
import { describe, expect, it, vi } from 'vitest';
import { MergedProposalData } from '../governanceData';
import { ProposalStage } from '../types';
import { useGovernanceProposal } from './useGovernanceProposals';

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
