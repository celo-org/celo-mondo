'use client';
import { PostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import { PropsWithChildren, useEffect } from 'react';
import { ToastContainer, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MiniPayNoCeloBanner } from 'src/components/banner/MiniPayNoCeloBanner';
import { ErrorBoundary } from 'src/components/errors/ErrorBoundary';
import { ErrorBoundaryInline } from 'src/components/errors/ErrorBoundaryInline';
import { Footer } from 'src/components/nav/Footer';
import { Header } from 'src/components/nav/Header';
import { LegalRestrict } from 'src/components/police';
import { WagmiContext } from 'src/config/wagmi';
import { TransactionModal } from 'src/features/transactions/TransactionModal';
import { scrubEventUrlProperties } from 'src/utils/posthog';
import { useIsSsr } from 'src/utils/ssr';
import ENSProvider from 'src/utils/useAddressToLabel';
import HistoryProvider from 'src/utils/useHistory';
import StakingModeProvider from 'src/utils/useStakingMode';
import 'src/vendor/inpage-metamask.js';
import 'src/vendor/polyfill';

function PHProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (posthog.__loaded) return;
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'never',
      autocapture: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'sessionStorage',
      defaults: '2026-01-30',
      internal_or_test_user_hostname: null,
      debug: false,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug();
        }
      },
      before_send: (event) => {
        if (event !== null) {
          delete event.properties['$ip'];
          scrubEventUrlProperties(event.properties);
        }

        return event;
      },
    });
  }, []);

  useEffect(() => {
    const markNoCapture = (mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('[data-rk] [role="dialog"]')) {
            node.classList.add('ph-no-capture');
          }
          node.querySelectorAll('[data-rk] [role="dialog"]').forEach((el) => {
            el.classList.add('ph-no-capture');
          });
        }
      }
    };

    const observer = new MutationObserver(markNoCapture);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export function App({ children }: PropsWithChildren<any>) {
  return (
    <ErrorBoundary>
      <SafeHydrate>
        <PHProvider>
          <WagmiContext>
            <HistoryProvider>
              <StakingModeProvider>
                <ENSProvider>
                  <LegalRestrict>
                    <BodyLayout>{children}</BodyLayout>
                  </LegalRestrict>
                  <TransactionModal />
                  <ErrorBoundaryInline>
                    <ToastContainer transition={Zoom} position="bottom-right" limit={12} />
                  </ErrorBoundaryInline>
                </ENSProvider>
              </StakingModeProvider>
            </HistoryProvider>
          </WagmiContext>
        </PHProvider>
      </SafeHydrate>
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
    <div className="relative flex h-full min-h-screen w-full flex-col justify-between overflow-x-hidden bg-taupe-100 text-black">
      <Header />
      <MiniPayNoCeloBanner />
      <main className="flex w-full flex-1">{children}</main>
      <Footer />
    </div>
  );
}
