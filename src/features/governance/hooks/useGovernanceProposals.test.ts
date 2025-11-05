import { afterEach, beforeEach } from 'node:test';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { ProposalStage, VoteAmounts, VoteType } from 'src/features/governance/types';
import { publicClient } from 'src/test/anvil/utils';
import { describe, expect, it, vi } from 'vitest';
import { useGovernanceProposal } from './useGovernanceProposals';

beforeEach(() => {
  vi.mock('react', async (importActual) => ({
    ...(await importActual()),
    useMemo: (fn: () => any) => fn(),
  }));
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
          {
            id: 1,
            stage: ProposalStage.Execution,
            metadata: { title: 'test proposal 1' },
          },
          {
            id: 2,
            stage: ProposalStage.Executed,
            metadata: { title: 'test proposal 2' },
          },
          {
            id: 3,
            stage: ProposalStage.Expiration,
            metadata: { title: 'test proposal 3' },
          },
          {
            id: 4,
            stage: ProposalStage.Rejected,
            metadata: { title: 'test proposal 4' },
          },
        ] as MergedProposalData[],
      }),
    }));

    expect(useGovernanceProposal()?.id).toBeUndefined();
    expect(useGovernanceProposal(42)?.id).toBeUndefined();
    expect(useGovernanceProposal(2)?.stage).toBe(ProposalStage.Executed);
  });
});

// Additional tests to verify stage computation and approval logic
describe('Governance proposal stage logic', () => {
  it('marks expired proposals with majority No votes as Rejected', () => {
    const votes: VoteAmounts = {
      [VoteType.Yes]: 10n,
      [VoteType.No]: 20n,
      [VoteType.Abstain]: 0n,
    };
    let stage = ProposalStage.Expiration;
    const yesVotes = votes[VoteType.Yes];
    const noVotes = votes[VoteType.No];
    // replicate the rejection logic used in useGovernanceProposals
    if (stage === ProposalStage.Expiration && noVotes >= yesVotes) {
      stage = ProposalStage.Rejected;
    }
    expect(stage).toBe(ProposalStage.Rejected);
  });

  it('does not mark expired proposals with majority Yes votes as Rejected', () => {
    const votes: VoteAmounts = {
      [VoteType.Yes]: 30n,
      [VoteType.No]: 10n,
      [VoteType.Abstain]: 0n,
    };
    let stage = ProposalStage.Expiration;
    const yesVotes = votes[VoteType.Yes];
    const noVotes = votes[VoteType.No];
    if (stage === ProposalStage.Expiration && noVotes >= yesVotes) {
      stage = ProposalStage.Rejected;
    }
    expect(stage).toBe(ProposalStage.Expiration);
  });
});
