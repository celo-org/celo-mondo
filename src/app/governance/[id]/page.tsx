import { Proposal } from 'src/app/governance/[id]/Proposal';

export const dynamicParams = true;

export const metadata = {
  title: 'Proposal',
  description: 'View a proposal on Celo Mondo',
};
// DO NOT USE use client here as it breaks metadata
export default function Page({ params: { id } }: { params: { id: string } }) {
  return <Proposal id={id} />;
}
