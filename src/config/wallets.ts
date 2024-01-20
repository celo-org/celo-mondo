// Wallet configs not already available in other libs like RainbowKit

import { getWalletConnectConnector, type Wallet } from '@rainbow-me/rainbowkit';
import type { DefaultWalletOptions } from '@rainbow-me/rainbowkit/dist/wallets/Wallet.js';

export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

export const valora = ({ projectId, walletConnectParameters }: DefaultWalletOptions): Wallet => ({
  id: 'valora',
  name: 'Valora',
  iconUrl: '/logos/valora.jpg',
  iconBackground: '#FFF',
  downloadUrls: {
    android: 'https://play.google.com/store/apps/details?id=co.clabs.valora',
    ios: 'https://apps.apple.com/app/id1520414263?mt=8',
    qrCode: 'https://valoraapp.com/',
  },
  mobile: {
    getUri: (uri) => {
      return isAndroid() ? uri : `celo://wallet/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  qrCode: {
    getUri: (uri: string) => uri,
  },
  createConnector: getWalletConnectConnector({
    projectId,
    walletConnectParameters,
  }),
});
