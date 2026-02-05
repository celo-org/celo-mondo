'use client';

import Image from 'next/image';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { BRIDGES } from 'src/config/bridges';
import { Bridge } from 'src/types/bridge';
import { useTrackEvent } from 'src/utils/useTrackEvent';

export default function Page() {
  return (
    <Section className="mt-6" containerClassName="space-y-6 max-w-screen-md">
      <H1>Bridge to Celo</H1>
      {BRIDGES.map((bridge) => (
        <BridgeLink key={bridge.id} {...bridge} />
      ))}
      <p className="text-center text-sm text-taupe-600">
        These bridges are independent, third-party service providers.
        <br />
        Celo assumes no responsibility for their operation.
      </p>
    </Section>
  );
}

function BridgeLink({ id, name, operator, href, logo, description }: Bridge) {
  const trackEvent = useTrackEvent();

  const handleBridgeClick = () => {
    trackEvent('bridge_clicked', { bridgeId: id });
  };

  return (
    <div className="flex max-w-xl items-center justify-between self-center border border-taupe-300 bg-white p-4 sm:p-5">
      <div className="flex items-center space-x-4">
        <Image src={logo} width={60} height={60} alt="" className="rounded-full" />
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl">{name}</h2>
          <h3 className="text-sm">{`By ${operator}`}</h3>
          <p className="max-w-xs text-xs">{description}</p>
        </div>
      </div>
      <SolidButton className="bg-primary text-primary-content all:p-0">
        <A_Blank
          className="flex items-center space-x-2 px-5 py-3.5"
          href={href}
          onClick={handleBridgeClick}
          data-testid={id}
        >
          <span>Bridge</span>
          <ChevronIcon direction="e" width={12} height={12} />
        </A_Blank>
      </SolidButton>
    </div>
  );
}
