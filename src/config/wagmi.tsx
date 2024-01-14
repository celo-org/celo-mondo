import { RainbowKitProvider, connectorsForWallets, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import {
  ledgerWallet,
  metaMaskWallet,
  omniWallet,
  trustWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { config } from 'src/config/config';
import { links } from 'src/config/links';
import { valora } from 'src/config/wallets';
import { Color } from 'src/styles/Color';
import { celo } from 'viem/chains';
import { WagmiProvider, createConfig, http } from 'wagmi';

export const fornoRpcUrl = `${links.forno}?apikey=${config.fornoApiKey}`;
export const infuraRpcUrl = `${links.infura}/${config.infuraApiKey}`;

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended for Celo',
      wallets: [metaMaskWallet, walletConnectWallet, valora, omniWallet, trustWallet, ledgerWallet],
    },
  ],
  { appName: config.appName, projectId: config.walletConnectProjectId },
);

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors,
  transports: {
    [celo.id]: http(),
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
