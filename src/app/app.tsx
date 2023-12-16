'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { PropsWithChildren } from 'react';
import { ToastContainer, Zoom, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ErrorBoundary } from 'src/components/errors/ErrorBoundary';
import { Footer } from 'src/components/nav/Footer';
import { Header } from 'src/components/nav/Header';
import { WagmiContext } from 'src/config/wagmi';
import { useIsSsr } from 'src/utils/ssr';
import 'src/vendor/inpage-metamask';

const reactQueryClient = new QueryClient({});

function SafeHydrate({ children }: PropsWithChildren<any>) {
  // Disable app SSR for now as it's not needed and
  // complicates wallet integrations
  const isSsr = useIsSsr();
  if (isSsr) {
    return <div></div>;
  } else {
    return children;
  }
}

export function App({ children }: PropsWithChildren<any>) {
  return (
    <ErrorBoundary>
      <SafeHydrate>
        <QueryClientProvider client={reactQueryClient}>
          <WagmiContext>
            <BodyLayout>{children}</BodyLayout>
            <ToastContainer transition={Zoom} position={toast.POSITION.BOTTOM_RIGHT} />
          </WagmiContext>
        </QueryClientProvider>
      </SafeHydrate>
      <Analytics />
    </ErrorBoundary>
  );
}

export function BodyLayout({ children }: PropsWithChildren<any>) {
  return (
    <div className="min-w-screen bg-taupe-100 relative flex h-full min-h-screen w-full flex-col justify-between text-black">
      <Header />
      <main className="w-full flex-1">{children}</main>
      <Footer />
    </div>
  );
}
