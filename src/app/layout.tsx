import { Metadata } from 'next';
import { PropsWithChildren } from 'react';
import { links } from 'src/config/links';
import { alpinaFont, interFont } from 'src/styles/fonts';
import 'src/styles/globals.css';
import { App } from './app';

export const metadata: Metadata = {
  applicationName: 'Celo Station',
  metadataBase: new URL(links.home),
  title: {
    default: 'Celo Station | Staking & Governance for Celo',
    template: '%s | Celo Station | Staking & Governance for Celo',
  },
  description:
    'Participate in Celo staking and governance. Start earning automatic rewards on your CELO!',
  keywords: ['celo', 'staking', 'governance', 'delegation', 'station'],
  openGraph: {
    title: 'Celo Station',
    description: 'Staking & Governance for Celo',
    images: [`/logos/celo-station.png`],
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: [
    { rel: 'icon', url: '/favicon.png' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
  ],
};

export default function RootLayout({ children }: PropsWithChildren<any>) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${interFont.variable} ${alpinaFont.variable} font-sans text-base`}>
        <App>{children}</App>
      </body>
    </html>
  );
}
