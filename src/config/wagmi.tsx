import { Celo } from '@celo/rainbowkit-celo/chains';
import { Valora } from '@celo/rainbowkit-celo/wallets';
import { RainbowKitProvider, connectorsForWallets, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import {
  metaMaskWallet,
  omniWallet,
  trustWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc';
import 'react-toastify/dist/ReactToastify.css';
import { config } from 'src/config/config';
import { Color } from 'src/styles/Color';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';

const { chains, publicClient } = configureChains(
  [Celo],
  [jsonRpcProvider({ rpc: (chain) => ({ http: chain.rpcUrls.default.http[0] }) })],
);

export const wagmiChains = chains;

const connectorConfig = {
  chains,
  publicClient,
  appName: 'Celo Station',
  projectId: config.walletConnectProjectId,
};

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended for Celo',
    wallets: [
      metaMaskWallet(connectorConfig),
      walletConnectWallet(connectorConfig),
      Valora(connectorConfig),
      // CeloTerminal(connectorConfig),
      // CeloWallet(connectorConfig),
      omniWallet(connectorConfig),
      trustWallet(connectorConfig),
      // ledger
    ],
  },
]);

export const wagmiConfig = createConfig({
  autoConnect: true,
  publicClient,
  connectors,
});

export function WagmiContext({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={wagmiChains}
        theme={lightTheme({
          accentColor: Color.Yellow,
          borderRadius: 'small',
          fontStack: 'system',
        })}
        initialChain={Celo.id}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
