import JumperLogo from 'src/images/logos/jumper-bridge.png';
import PortalLogo from 'src/images/logos/portal-bridge.jpg';
import SquidLogo from 'src/images/logos/squid-router.jpg';
import USDT0Logo from 'src/images/logos/usdt0.webp';
import { Bridge } from 'src/types/bridge';

const BRIDGES: Bridge[] = [
  {
    id: 'superbridge',
    name: 'Superbridge',
    operator: 'Superbridge',
    href: 'https://superbridge.app/?fromChainId=42220&toChainId=1',
    logo: '/logos/superbridge.jpg',
    description: 'Native Celo L2 bridge. Good for moving CELO and ETH between Ethereum and Celo.',
  },
  {
    id: 'squid-router',
    name: 'Squid Router',
    operator: 'Squid',
    href: 'https://app.squidrouter.com/?chains=42220%2C1&tokens=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    logo: SquidLogo,
    description:
      'Axelar based cross chain DEX. Good for moving stablecoins between chains, or swapping directly between assets.',
  },
  {
    id: 'jumper',
    name: 'Jumper',
    operator: 'Jumper',
    href: 'https://jumper.exchange/?fromChain=42220&fromToken=0x471EcE3750Da237f93B8E339c536989b8978a438&toChain=1&toToken=0x0000000000000000000000000000000000000000',
    logo: JumperLogo,
    description:
      'Cross-chain aggregator that compares routes across multiple bridges and DEXs to find optimal paths for swapping and bridging assets.',
  },
  {
    id: 'portal-bridge',
    name: 'Portal Bridge',
    operator: 'Wormhole',
    href: 'https://portalbridge.com/?fromChain=Celo&toChain=Ethereum&fromToken=CELO',
    logo: PortalLogo,
    description: 'Wormhole based bridge. Good for wormhole assets on Celo.',
  },
  {
    id: 'usdt0',
    name: 'USDT0',
    operator: 'USDT0',
    href: 'https://usdt0.to/transfer?source=celo&destination=ethereum&token=usdt0',
    logo: USDT0Logo,
    description: '1:1 transfers of native USDT powered by the Layer Zero OFT. Best for moving USDT',
  },
];
