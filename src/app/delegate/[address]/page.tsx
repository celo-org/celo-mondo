'use client';

import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Section } from 'src/components/layout/Section';
import { SocialLinkLogo } from 'src/components/logos/SocialLinkLogo';
import { Amount } from 'src/components/numbers/Amount';
import { ShortAddress } from 'src/components/text/ShortAddress';
import { SocialLinkType } from 'src/config/types';
import { DelegateeLogo } from 'src/features/delegation/DelegateeLogo';
import { Delegatee } from 'src/features/delegation/types';
import { useDelegatees } from 'src/features/delegation/useDelegatees';
import { VotingPower } from 'src/features/governance/components/VotingPower';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
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
      <DelegateButton delegatee={delegatee} />
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

function DelegateButton({ delegatee }: { delegatee: Delegatee }) {
  const showTxModal = useTransactionModal(TransactionFlowType.Delegate, {
    delegatee: delegatee.address,
  });

  return (
    <div className="space-y-4 border-taupe-300 p-3 lg:mt-4 lg:border">
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Delegate</h2>
        <VotingPower />
      </div>
      <SolidButton
        className="btn-neutral w-full"
        onClick={() => showTxModal()}
      >{`️🗳️ Delegate voting power`}</SolidButton>
      <div>
        <h3 className="text-sm">{`Delegate's current voting power`}</h3>
        <Amount valueWei={delegatee.votingPower} className="text-xl" />
      </div>
    </div>
  );
}
