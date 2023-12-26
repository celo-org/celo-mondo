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
import { infuraProvider } from '@wagmi/core/providers/infura';
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc';
import 'react-toastify/dist/ReactToastify.css';
import { config } from 'src/config/config';
import { links } from 'src/config/links';
import { Color } from 'src/styles/Color';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';

export const fornoRpcUrl = `${links.forno}?apikey=${config.fornoApiKey}`;
export const infuraRpcUrl = `${links.infura}/${config.infuraApiKey}`;
const { chains, publicClient } = configureChains(
  [
    {
      ...Celo,
      rpcUrls: {
        default: { http: [fornoRpcUrl] },
        infura: { http: [links.infura] },
        public: { http: [fornoRpcUrl] },
      },
    },
  ],
  [
    jsonRpcProvider({ rpc: (chain) => ({ http: chain.rpcUrls.default.http[0] }) }),
    infuraProvider({ apiKey: config.infuraApiKey }),
  ],
  {},
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
        chains={chains}
        theme={lightTheme({
          accentColor: Color.Fig,
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
