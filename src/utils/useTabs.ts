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
      // Shallow replace: keeps the URL shareable without re-running the route.
      // Replace (not push) so the app's own navigation depth tracking in
      // useHistory — which only records pathname changes — stays consistent
      // with the real browser history for BackLink fallbacks.
      window.history.replaceState(null, '', url);
    }
  }, []);

  return {
    onTabChange,
    tab,
  };
}
