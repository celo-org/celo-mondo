'use client';
import { Analytics } from '@vercel/analytics/react';
import { PropsWithChildren } from 'react';
import { ToastContainer, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ErrorBoundary } from 'src/components/errors/ErrorBoundary';
import { Footer } from 'src/components/nav/Footer';
import { Header } from 'src/components/nav/Header';
import { LegalRestrict } from 'src/components/police';
import { WagmiContext } from 'src/config/wagmi';
import { TransactionModal } from 'src/features/transactions/TransactionModal';
import { useIsSsr } from 'src/utils/ssr';
import 'src/vendor/inpage-metamask.js';
import 'src/vendor/polyfill';

export function App({ children }: PropsWithChildren<any>) {
  return (
    <ErrorBoundary>
      <SafeHydrate>
        <WagmiContext>
          <LegalRestrict>
            <BodyLayout>{children}</BodyLayout>
          </LegalRestrict>
          <TransactionModal />
          <ToastContainer transition={Zoom} position="bottom-right" />
        </WagmiContext>
      </SafeHydrate>
      <Analytics />
    </ErrorBoundary>
  );
}

function SafeHydrate({ children }: PropsWithChildren<any>) {
  // Avoid SSR for now as it's not needed and it
  // complicates wallet integrations and media query hooks
  const isSsr = useIsSsr();
  if (isSsr) {
    return <div></div>;
  } else {
    return children;
  }
}

export function BodyLayout({ children }: PropsWithChildren<any>) {
  return (
    <div className="relative flex h-full min-h-screen w-screen flex-col justify-between bg-taupe-100 text-black">
      <Header />
      <main className="flex w-full flex-1">{children}</main>
      <Footer />
    </div>
  );
}
