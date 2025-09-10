'use client';

import Image from 'next/image';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { config } from 'src/config/config';
import PortalLogo from 'src/images/logos/portal-bridge.jpg';
import SquidLogo from 'src/images/logos/squid-router.jpg';
import USDT0Logo from 'src/images/logos/usdt0.webp';

interface Bridge {
  name: string;
  operator: string;
  href: string;
  logo: any;
  description: string;
}

const BRIDGES: Bridge[] = [
  {
    name: 'Superbridge',
    operator: 'Superbridge',
    href: `https://superbridge.app/celo${config.chain.testnet ? '-testnet' : ''}`,
    logo: '/logos/superbridge.jpg',
    description: 'Native Celo L2 bridge. Good for moving CELO and ETH between Ethereum and Celo.',
  },
  {
    name: 'Squid Router',
    operator: 'Squid',
    href: 'https://v2.app.squidrouter.com',
    logo: SquidLogo,
    description:
      'Axelar based cross chain DEX. Good for moving stablecoins between chains, or swapping directly between assets.',
  },
  {
    name: 'Portal Bridge',
    operator: 'Wormhole',
    href: 'https://portalbridge.com',
    logo: PortalLogo,
    description: 'Wormhole based bridge. Good for wormhole assets on Celo.',
  },
  {
    name: 'USDT0',
    operator: 'USDT0',
    href: 'https://usdt0.to/transfer',
    logo: USDT0Logo,
    description: '1:1 transfers of native USDT powered by the Layer Zero OFT. Best for moving USDT',
  },
];

export default function Page() {
  return (
    <Section className="mt-6" containerClassName="space-y-6">
      <H1>Bridge to Celo</H1>
      {BRIDGES.map((bridge) => (
        <BridgeLink key={bridge.name} {...bridge} />
      ))}
      <p className="text-center text-sm text-taupe-600">
        These bridges are independent, third-party service providers.
        <br />
        Celo assumes no responsibility for their operation.
      </p>
    </Section>
  );
}

function BridgeLink({ name, operator, href, logo, description }: Bridge) {
  return (
    <div className="mx-auto flex max-w-xl items-center justify-between border border-taupe-300 bg-white p-4 sm:p-5">
      <div className="flex items-center space-x-4">
        <Image src={logo} width={60} height={60} alt="" className="rounded-full" />
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl">{name}</h2>
          <h3 className="text-sm">{`By ${operator}`}</h3>
          <p className="text-sm">{description}</p>
        </div>
      </div>
      <SolidButton className="all:p-0">
        <A_Blank className="flex items-center space-x-2 px-5 py-3.5" href={href}>
          <span>Bridge</span>
          <ChevronIcon direction="e" width={12} height={12} />
        </A_Blank>
      </SolidButton>
    </div>
  );
}
