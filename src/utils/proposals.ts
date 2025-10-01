import { MergedProposalData } from 'src/features/governance/governanceData';

export function sortByIdThenCGP(
  proposals: MergedProposalData[] | undefined | null,
): MergedProposalData[] {
  if (!proposals) return [];

  return proposals.sort((a, b) => {
    if (!a.id || !b.id) {
      if (a.proposal?.id) return -1;
      if (b.proposal?.id) return 1;
      return b.metadata!.cgp - a.metadata!.cgp;
    }
    return (b.proposal?.id || 0) - (a.proposal?.id || 0);
  });
}
