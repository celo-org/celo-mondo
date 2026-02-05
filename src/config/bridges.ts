import PortalLogo from 'src/images/logos/portal-bridge.jpg';
import SquidLogo from 'src/images/logos/squid-router.jpg';
import USDT0Logo from 'src/images/logos/usdt0.webp';
import { Bridge } from 'src/types/bridge';
import { config } from './config';

export const BRIDGES: Bridge[] = [
  {
    id: 'superbridge',
    name: 'Superbridge',
    operator: 'Superbridge',
    href: `https://superbridge.app/celo${config.chain.testnet ? '-testnet' : ''}`,
    logo: '/logos/superbridge.jpg',
    description: 'Native Celo L2 bridge. Good for moving CELO and ETH between Ethereum and Celo.',
  },
  {
    id: 'squid-router',
    name: 'Squid Router',
    operator: 'Squid',
    href: 'https://v2.app.squidrouter.com',
    logo: SquidLogo,
    description:
      'Axelar based cross chain DEX. Good for moving stablecoins between chains, or swapping directly between assets.',
  },
  {
    id: 'portal-bridge',
    name: 'Portal Bridge',
    operator: 'Wormhole',
    href: 'https://portalbridge.com',
    logo: PortalLogo,
    description: 'Wormhole based bridge. Good for wormhole assets on Celo.',
  },
  {
    id: 'usdt0',
    name: 'USDT0',
    operator: 'USDT0',
    href: 'https://usdt0.to/transfer',
    logo: USDT0Logo,
    description: '1:1 transfers of native USDT powered by the Layer Zero OFT. Best for moving USDT',
  },
];
