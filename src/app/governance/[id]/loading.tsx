import { Section } from 'src/components/layout/Section';
import { ProposalDetailSkeleton } from 'src/features/governance/components/Proposal';

// Streamed immediately on navigation while the proposal page renders on the
// server (first, uncached visit of an id)
export default function Loading() {
  return (
    <Section containerClassName="mt-4 lg:flex lg:flex-row lg:gap-6">
      <ProposalDetailSkeleton />
    </Section>
  );
}
