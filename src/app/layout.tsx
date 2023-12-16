import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PropsWithChildren } from 'react';
import { links } from 'src/config/links';
import 'src/styles/globals.css';
import { App } from './app';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

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
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <App>{children}</App>
      </body>
    </html>
  );
}
