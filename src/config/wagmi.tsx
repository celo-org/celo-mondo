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
import { useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { config, infuraRpcUrl } from 'src/config/config';
import { Color } from 'src/styles/Color';
import { celo, celoAlfajores } from 'viem/chains';
import { WagmiProvider, createConfig, fallback, http } from 'wagmi';

function buildWagmiConfig() {
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

  return createConfig({
    chains: [config.chain],
    connectors,
    syncConnectedChain: false, // only have 1 chain per deployment
    ssr: true, // render a disconnected state on the server, reconnect after hydration
    transports: {
      [celo.id]: fallback([http(config.chain.rpcUrls.default.http[0]), http(infuraRpcUrl)]),
      [celoAlfajores.id]: http(config.chain.rpcUrls.default.http[0]),
    },
  });
}

// Lazy module-level singleton: the config is static (no per-request state),
// and rebuilding the full connector set on every server-rendered request
// would be wasted work
let wagmiConfig: ReturnType<typeof buildWagmiConfig> | undefined;
function getWagmiConfig() {
  wagmiConfig ??= buildWagmiConfig();
  return wagmiConfig;
}

export function WagmiContext({ children }: { children: React.ReactNode }) {
  const config = getWagmiConfig();
  // One QueryClient per React tree; a module-level singleton would leak cached
  // data between requests when rendering on the server
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
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
