import JumperLogo from 'src/images/logos/jumper-bridge.png';
import PortalLogo from 'src/images/logos/portal-bridge.jpg';
import RelayLogo from 'src/images/logos/relay.svg';
import SquidLogo from 'src/images/logos/squid-router.jpg';
import USDT0Logo from 'src/images/logos/usdt0.webp';
import { Bridge } from 'src/types/bridge';

export const BRIDGES: Bridge[] = [
  {
    id: 'superbridge', // Stable unique key used for bridge identification.
    name: 'Superbridge', // User-facing bridge name.
    operator: 'Superbridge', // Organization or protocol operating the bridge.
    href: 'https://superbridge.app/?fromChainId=1&toChainId=42220', // Default bridge URL shown to users.
    logo: '/logos/superbridge.jpg', // Logo asset rendered in bridge lists/cards.
    description: 'Native Celo L2 bridge. Good for moving CELO and ETH between Ethereum and Celo.', // Short user-facing summary of best use cases.
  },
  {
    id: 'squid-router', // Stable unique key used for bridge identification.
    name: 'Squid Router', // User-facing bridge name.
    operator: 'Squid', // Organization or protocol operating the bridge.
    href: 'https://app.squidrouter.com/?chains=1%2C42220&tokens=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE%2C0xd221812de1bd094f35587ee8e174b07b6167d9af', // Default bridge URL shown to users.
    logo: SquidLogo, // Logo asset rendered in bridge lists/cards.
    description:
      'Axelar based cross chain DEX. Good for moving stablecoins between chains, or swapping directly between assets.', // Short user-facing summary of best use cases.
  },
  {
    id: 'jumper', // Stable unique key used for bridge identification.
    name: 'Jumper', // User-facing bridge name.
    operator: 'Jumper', // Organization or protocol operating the bridge.
    href: 'https://jumper.exchange/?fromChain=1&fromToken=0x0000000000000000000000000000000000000000&toChain=42220&toToken=0x471EcE3750Da237f93B8E339c536989b8978a438', // Default bridge URL shown to users.
    logo: JumperLogo, // Logo asset rendered in bridge lists/cards.
    description:
      'Cross-chain aggregator that compares routes across multiple bridges and DEXs to find optimal paths for swapping and bridging assets.', // Short user-facing summary of best use cases.
  },
  {
    id: 'portal-bridge', // Stable unique key used for bridge identification.
    name: 'Portal Bridge', // User-facing bridge name.
    operator: 'Wormhole', // Organization or protocol operating the bridge.
    href: 'https://portalbridge.com/?fromChain=Ethereum&toChain=Celo&fromToken=ETH&toToken=0x66803FB87aBd4aaC3cbB3fAd7C3aa01f6F3FB207', // Default bridge URL shown to users.
    logo: PortalLogo, // Logo asset rendered in bridge lists/cards.
    description: 'Wormhole based bridge. Good for wormhole assets on Celo.', // Short user-facing summary of best use cases.
  },
  {
    id: 'relay', // Stable unique key used for bridge identification.
    name: 'Relay', // User-facing bridge name.
    operator: 'Relay', // Organization or protocol operating the bridge.
    href: 'https://relay.link/bridge/celo?fromChainId=1&toChainId=42220&fromCurrency=0x0000000000000000000000000000000000000000&toCurrency=0x471EcE3750Da237f93B8E339c536989b8978a438', // Default bridge URL shown to users.
    logo: RelayLogo, // Logo asset rendered in bridge lists/cards.
    description:
      'Fast, low-cost cross-chain bridge and swap aggregator. Good for quick transfers between Ethereum, L2s, and Celo.', // Short user-facing summary of best use cases.
  },
  {
    id: 'usdt0', // Stable unique key used for bridge identification.
    name: 'USDT0', // User-facing bridge name.
    operator: 'USDT0', // Organization or protocol operating the bridge.
    href: 'https://usdt0.to/transfer?source=ethereum&destination=celo&token=usdt0', // Default bridge URL shown to users.
    logo: USDT0Logo, // Logo asset rendered in bridge lists/cards.
    description: '1:1 transfers of native USDT powered by the Layer Zero OFT. Best for moving USDT', // Short user-facing summary of best use cases.
  },
];