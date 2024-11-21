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
import { useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { config, fornoRpcUrl, infuraRpcUrl } from 'src/config/config';
import { Color } from 'src/styles/Color';
import { fallback } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';
import { WagmiProvider, createConfig, http } from 'wagmi';

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
  chains: [config.useAlfajores ? celoAlfajores : celo],
  connectors,
  transports: {
    [celo.id]: fallback([http(fornoRpcUrl), http(infuraRpcUrl)]),
    [celoAlfajores.id]: http(),
  },
});

export function WagmiContext({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
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
