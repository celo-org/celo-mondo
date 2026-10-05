'use client';
import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { Section } from 'src/components/layout/Section';
import { CollapsibleResponsiveMenu } from 'src/components/menus/CollapsibleResponsiveMenu';
import {
  DelegateeDescription,
  DelegateeDetails,
} from 'src/features/delegation/components/DelegateeDescription';
import { DelegateesData, useDelegatees } from 'src/features/delegation/hooks/useDelegatees';
import { usePageInvariant } from 'src/utils/navigation';
import { deserializeBigints } from 'src/utils/objects';

export default function Page({
  address,
  initialDelegatees,
}: {
  address: Address;
  initialDelegatees?: string;
}) {
  // Serialized because RSC prop serialization downgrades bigints to strings
  const initialData = useMemo(
    () => (initialDelegatees ? deserializeBigints<DelegateesData>(initialDelegatees) : undefined),
    [initialDelegatees],
  );
  const { addressToDelegatee } = useDelegatees(initialData);
  const delegatee = addressToDelegatee?.[address];

  usePageInvariant(!addressToDelegatee || delegatee, '/delegate', 'Delegate not found');

  if (!addressToDelegatee || !delegatee) {
    return <FullWidthSpinner>Loading delegate data</FullWidthSpinner>;
  }

  return (
    <Section containerClassName="mt-4 lg:flex lg:flex-row lg:gap-6 lg:items-start lg:max-w-(--breakpoint-lg)">
      <DelegateeDescription delegatee={delegatee} />
      <CollapsibleResponsiveMenu>
        <DelegateeDetails delegatee={delegatee} />
      </CollapsibleResponsiveMenu>
    </Section>
  );
}
