'use client';

import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { Section } from 'src/components/layout/Section';
import { SocialLinkLogo } from 'src/components/logos/SocialLinkLogo';
import { CollapsibleResponsiveMenu } from 'src/components/menus/CollapsibleResponsiveMenu';
import { ShortAddress } from 'src/components/text/ShortAddress';
import { SocialLinkType } from 'src/config/types';
import { DelegateButton } from 'src/features/delegation/DelegateButton';
import { DelegateeLogo } from 'src/features/delegation/DelegateeLogo';
import { Delegatee } from 'src/features/delegation/types';
import { useDelegatees } from 'src/features/delegation/useDelegatees';
import { usePageInvariant } from 'src/utils/navigation';

export const dynamicParams = true;

export default function Page({ params: { address } }: { params: { address: Address } }) {
  const { addressToDelegatee } = useDelegatees();
  const delegatee = addressToDelegatee?.[address];

  usePageInvariant(!addressToDelegatee || delegatee, '/delegate', 'Delegate not found');

  // const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  if (!addressToDelegatee || !delegatee) {
    return <FullWidthSpinner>Loading delegate data</FullWidthSpinner>;
  }

  return (
    <Section containerClassName="mt-4 lg:flex lg:gap-6 lg:items-start">
      <DelegateeDescription delegatee={delegatee} />
      <CollapsibleResponsiveMenu>
        <DelegateButton delegatee={delegatee} />
      </CollapsibleResponsiveMenu>
    </Section>
  );
}

function DelegateeDescription({ delegatee }: { delegatee: Delegatee }) {
  const dateString = new Date(delegatee.date).toLocaleDateString();

  return (
    <div className="space-y-4">
      <BackLink href="/delegate">Browse delegates</BackLink>
      <div className="flex items-center gap-1">
        <DelegateeLogo address={delegatee.address} size={86} />
        <div className="ml-4 flex flex-col">
          <h1 className="font-serif text-2xl md:text-3xl">{delegatee.name}</h1>
          <div className="flex items-center space-x-2">
            <ShortAddress address={delegatee.address} className="text-sm text-taupe-600" />
            <span className="text-sm text-taupe-600">•</span>
            <span className="text-sm text-taupe-600">{`Since ${dateString}`}</span>
          </div>
          <div className="mt-1 flex items-center space-x-3">
            {Object.entries(delegatee.links).map(([type, href], i) => (
              <SocialLinkLogo key={i} type={type as SocialLinkType} href={href} />
            ))}
            {delegatee.interests.map((interest, i) => (
              <span key={i} className="rounded-full border border-taupe-300 px-2 text-sm">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
      <h2 className="font-serif text-xl">Introduction</h2>
      <p style={{ maxWidth: 'min(96vw, 700px)', overflow: 'auto' }}>{delegatee.description}</p>
    </div>
  );
}
