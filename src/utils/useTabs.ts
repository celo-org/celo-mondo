'use client';
import { useCallback, useEffect, useState } from 'react';

// Reads/writes the ?tab= query param without useSearchParams so that pages
// using tabs can still be statically rendered (useSearchParams would force a
// client-side rendering bailout up to the nearest Suspense boundary).
export default function useTabs<Tab extends string>(defaultTab: Tab) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    const syncFromUrl = () => {
      const param = new URLSearchParams(window.location.search).get('tab') as Tab | null;
      setTab(param || defaultTab);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [defaultTab]);

  const onTabChange = useCallback((nextTab: Tab) => {
    setTab(nextTab);
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== nextTab) {
      url.searchParams.set('tab', nextTab);
      // Shallow update: keep the URL shareable without re-running the route
      window.history.pushState(null, '', url);
    }
  }, []);

  return {
    onTabChange,
    tab,
  };
}
