import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

export default function useTabs<
  Tabs extends readonly string[],
  Tab extends Tabs[number] = Tabs[number],
>(defaultTab: Tab) {
  const router = useRouter();
  const params = useSearchParams();
  const initialTab = (params?.get('tab') as Tab) || defaultTab;
  const [tab, setTab] = useState<Tabs[number]>(initialTab);

  const onTabChange = useCallback(
    (tab: Tab) => {
      setTab(tab);
      if (params?.get('tab') !== tab) {
        router.push('?tab=' + tab);
      }
    },
    [router, params],
  );

  return {
    onTabChange,
    tab,
  };
}
