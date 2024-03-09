'use client';

import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { Section } from 'src/components/layout/Section';
import { useDelegatees } from 'src/features/delegation/useDelegatees';
import { usePageInvariant } from 'src/utils/navigation';

export const dynamicParams = true;

export default function Page({ params: { address } }: { params: { address: Address } }) {
  const { addressToDelegatee } = useDelegatees();
  const delegatee = addressToDelegatee?.[address];

  usePageInvariant(!addressToDelegatee || delegatee, '/delegate', 'Delegate not found');

  // const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  if (!addressToDelegatee) {
    return <FullWidthSpinner>Loading delegate data</FullWidthSpinner>;
  }

  return <Section containerClassName="mt-4 lg:flex lg:flex-row lg:gap-6">TODO</Section>;
}
