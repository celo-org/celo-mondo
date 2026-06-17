import JumperLogo from 'src/images/logos/jumper-bridge.png';
import PortalLogo from 'src/images/logos/portal-bridge.jpg';
import RelayLogo from 'src/images/logos/relay.svg';
import SquidLogo from 'src/images/logos/squid-router.jpg';
import USDT0Logo from 'src/images/logos/usdt0.webp';
import { Bridge } from 'src/types/bridge';

export const BRIDGES: Bridge[] = [
  {
    id: 'superbridge',
    name: 'Superbridge',
    operator: 'Superbridge',
    href: 'https://superbridge.app/?fromChainId=1&toChainId=42220',
    logo: '/logos/superbridge.jpg',
    description: 'Native Celo L2 bridge. Good for moving CELO and ETH between Ethereum and Celo.',
  },
  {
    id: 'squid-router',
    name: 'Squid Router',
    operator: 'Squid',
    href: 'https://app.squidrouter.com/?chains=1%2C42220&tokens=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE%2C0xd221812de1bd094f35587ee8e174b07b6167d9af',
    logo: SquidLogo,
    description:
      'Axelar based cross chain DEX. Good for moving stablecoins between chains, or swapping directly between assets.',
  },
  {
    id: 'jumper',
    name: 'Jumper',
    operator: 'Jumper',
    href: 'https://jumper.exchange/?fromChain=1&fromToken=0x0000000000000000000000000000000000000000&toChain=42220&toToken=0x471EcE3750Da237f93B8E339c536989b8978a438',
    logo: JumperLogo,
    description:
      'Cross-chain aggregator that compares routes across multiple bridges and DEXs to find optimal paths for swapping and bridging assets.',
  },
  {
    id: 'portal-bridge',
    name: 'Portal Bridge',
    operator: 'Wormhole',
    href: 'https://portalbridge.com/?fromChain=Ethereum&toChain=Celo&fromToken=ETH&toToken=0x66803FB87aBd4aaC3cbB3fAd7C3aa01f6F3FB207',
    logo: PortalLogo,
    description: 'Wormhole based bridge. Good for wormhole assets on Celo.',
  },
  {
    id: 'relay',
    name: 'Relay',
    operator: 'Relay',
    href: 'https://relay.link/bridge/celo?fromChainId=1&toChainId=42220&fromCurrency=0x0000000000000000000000000000000000000000&toCurrency=0x471EcE3750Da237f93B8E339c536989b8978a438',
    logo: RelayLogo,
    description:
      'Fast, low-cost cross-chain bridge and swap aggregator. Good for quick transfers between Ethereum, L2s, and Celo.',
  },
  {
    id: 'usdt0',
    name: 'USDT0',
    operator: 'USDT0',
    href: 'https://usdt0.to/transfer?source=ethereum&destination=celo&token=usdt0',
    logo: USDT0Logo,
    description: '1:1 transfers of native USDT powered by the Layer Zero OFT. Best for moving USDT',
  },
];
