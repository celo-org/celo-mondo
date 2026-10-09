import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('src/features/governance/hooks/useProposalVoters', () => ({
  useProposalVoters: vi.fn(),
}));
vi.mock('src/styles/mediaQueries', () => ({ useIsMobile: () => false }));
vi.mock('src/utils/useAddressToLabel', () => ({
  CELONAMES_SUFFIX: '.celo',
  useAddressToLabel: () => (address: string) => ({ fallback: address }),
}));

import { useProposalVoters } from 'src/features/governance/hooks/useProposalVoters';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { ProposalVotersTable } from './ProposalVotersTable';

const NUM_VOTERS = 25;
const voters = Object.fromEntries(
  Array.from({ length: NUM_VOTERS }, (_, i) => [
    `0x${(i + 1).toString(16).padStart(40, '0')}`,
    { [VoteType.Yes]: BigInt(i + 1) * 10n ** 18n },
  ]),
);
const totals = { [VoteType.Yes]: BigInt(NUM_VOTERS) * 10n ** 18n };

describe('ProposalVotersTable', () => {
  test('shows the first 20 voters, then all of them on request', () => {
    vi.mocked(useProposalVoters).mockReturnValue({
      isLoading: false,
      isError: false,
      voters,
      totals,
    } as any);

    render(<ProposalVotersTable propData={{ id: 1, stage: ProposalStage.Executed } as any} />);

    const rows = screen.getAllByTitle('Copy');
    expect(rows).toHaveLength(20);
    // Largest vote first
    expect(rows[0].textContent).toBe(`0x${NUM_VOTERS.toString(16).padStart(40, '0')}`);
    expect(screen.queryByText('Others')).toBeNull();

    fireEvent.click(screen.getByText(`Show all ${NUM_VOTERS} votes`));

    expect(screen.getAllByTitle('Copy')).toHaveLength(NUM_VOTERS);
    expect(screen.getByText('Show fewer')).toBeTruthy();
  });
});
