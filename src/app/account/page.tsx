'use client';

import { Section } from 'src/components/layout/Section';
import { usePageInvariant } from 'src/utils/navigation';
import { useAccount } from 'wagmi';

export default function Page() {
  const account = useAccount();
  const address = account?.address;

  usePageInvariant(!!address, '/', 'No account connected');

  return <Section containerClassName="space-y-8">TODO</Section>;
}
