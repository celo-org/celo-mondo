'use client';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { Section } from 'src/components/layout/Section';
import { CollapsibleResponsiveMenu } from 'src/components/menus/CollapsibleResponsiveMenu';
import {
  DelegateeDescription,
  DelegateeDetails,
} from 'src/features/delegation/components/DelegateeDescription';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { usePageInvariant } from 'src/utils/navigation';

export default function Page({ address }: { address: Address }) {
  const { addressToDelegatee } = useDelegatees();
  const delegatee = addressToDelegatee?.[address];

  usePageInvariant(!addressToDelegatee || delegatee, '/delegate', 'Delegate not found');

  if (!addressToDelegatee || !delegatee) {
    return <FullWidthSpinner>Loading delegate data</FullWidthSpinner>;
  }

  return (
    <Section containerClassName="mt-4 lg:flex lg:gap-6 lg:items-start">
      <DelegateeDescription delegatee={delegatee} />
      <CollapsibleResponsiveMenu>
        <DelegateeDetails delegatee={delegatee} />
      </CollapsibleResponsiveMenu>
    </Section>
  );
}
