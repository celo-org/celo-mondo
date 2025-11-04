import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export default function useTabs<Tab extends string>(defaultTab: Tab) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params?.get('tab') as Tab) || defaultTab;

  const onTabChange = useCallback(
    (nextTab: Tab) => {
      if (params?.get('tab') !== nextTab) {
        router.push('?tab=' + nextTab);
      }
    },
    [router, params],
  );

  return {
    onTabChange,
    tab,
  };
}
