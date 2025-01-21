// DO NOT USE "use client" here as it breaks metadata
import { Section } from 'src/components/layout/Section';
import { Proposal } from 'src/features/governance/components/Proposal';

export const dynamicParams = true;

export const metadata = {
  title: 'Proposal | Celo Mondo',
  description: 'View a proposal on Celo Mondo',
};
export default function Page({ params: { id } }: { params: { id: string } }) {
  return (
    <Section containerClassName="mt-4 lg:flex lg:flex-row lg:gap-6">
      <Proposal id={id} />;
    </Section>
  );
}
