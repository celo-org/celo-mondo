import { RainbowKitProvider, connectorsForWallets, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import {
  braveWallet,
  injectedWallet,
  metaMaskWallet,
  omniWallet,
  rainbowWallet,
  safeWallet,
  trustWallet,
  valoraWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-toastify/dist/ReactToastify.css';
import { config, infuraRpcUrl } from 'src/config/config';
import { GCTime } from 'src/config/consts';
import { Color } from 'src/styles/Color';
import { celo, celoAlfajores } from 'viem/chains';
import { WagmiProvider, createConfig, fallback, http } from 'wagmi';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended for Celo',
      wallets: [
        valoraWallet,
        metaMaskWallet,
        rainbowWallet,
        omniWallet,
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

export const wagmiConfig = createConfig({
  chains: [config.chain],
  connectors,
  transports: {
    [celo.id]: fallback([http(config.chain.rpcUrls.default.http[0]), http(infuraRpcUrl)], {
      rank: true,
    }),
    [celoAlfajores.id]: http(config.chain.rpcUrls.default.http[0]),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: GCTime.Default,
      staleTime: GCTime.Default,
    },
  },
});

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
