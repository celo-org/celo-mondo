import { RainbowKitProvider, connectorsForWallets, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import {
  braveWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  trustWallet,
  valoraWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-toastify/dist/ReactToastify.css';
import { config, infuraRpcUrl } from 'src/config/config';
import { Color } from 'src/styles/Color';
import {
  arbitrum,
  base,
  bsc,
  celo,
  celoAlfajores,
  gnosis,
  hyperEvm,
  linea,
  mainnet,
  monad,
  optimism,
  polygon,
  scroll,
  worldchain,
} from 'viem/chains';
import { WagmiProvider, createConfig, fallback, http } from 'wagmi';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended for Celo',
      wallets: [
        valoraWallet,
        metaMaskWallet,
        rainbowWallet,
        trustWallet,
        braveWallet,
        safeWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  { appName: config.appName, projectId: config.walletConnectProjectId },
);

// Daimo Pay requires these chains for cross-chain deposits
const DAIMO_PAY_CHAINS = [
  arbitrum,
  base,
  bsc,
  celo,
  gnosis,
  hyperEvm,
  linea,
  mainnet,
  monad,
  optimism,
  polygon,
  scroll,
  worldchain,
] as const;

export const wagmiConfig = createConfig({
  chains: [config.chain, ...DAIMO_PAY_CHAINS.filter((c) => c.id !== config.chain.id)],
  connectors,
  syncConnectedChain: false, // only have 1 chain per deployment
  transports: {
    [celo.id]: fallback([http(config.chain.rpcUrls.default.http[0]), http(infuraRpcUrl)]),
    [celoAlfajores.id]: http(config.chain.rpcUrls.default.http[0]),
    // Default HTTP transports for Daimo Pay chains
    [arbitrum.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [gnosis.id]: http(),
    [hyperEvm.id]: http(),
    [linea.id]: http(),
    [mainnet.id]: http(),
    [monad.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [scroll.id]: http(),
    [worldchain.id]: http(),
  },
});

const queryClient = new QueryClient();

export function WagmiContext({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: Color.Fig,
            borderRadius: 'small',
            fontStack: 'system',
          })}
          initialChain={celo.id}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
