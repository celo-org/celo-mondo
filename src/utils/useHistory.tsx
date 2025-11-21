'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// NOTE: inspired by https://github.com/vercel/next.js/discussions/16337
// but the original post is about next/router which is for nextjs pages
function useHistoryInternal() {
  const [history, setHistory] = useState<string[]>([]);
  const { back: _back } = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const back = useCallback(() => {
    if (history.length > 1) {
      // NOTE: `router.back` doesnt trigger the 'popstate' event surprisingly
      // so that's why we also `setHistory` here
      _back();
      setHistory((prevState) => prevState.slice(0, -1));
      return true;
    }
    return false;
  }, [_back, history]);

  useEffect(() => {
    const url = `${pathname}?${searchParams}`;
    setHistory((prevState) => (prevState.at(-1) !== url ? [...prevState, url] : prevState));
  }, [pathname, searchParams]);

  useEffect(() => {
    const listener = (_event: PopStateEvent) => {
      setHistory((prevState) => prevState.slice(0, -1));
    };
    window.addEventListener('popstate', listener);

    return () => window.removeEventListener('popstate', listener);
  }, []);

  return { history, back };
}

const HistoryContext = createContext<ReturnType<typeof useHistoryInternal>>({
  history: [],
  back: () => false,
});

function HistoryProvider({ children }: PropsWithChildren) {
  const history = useHistoryInternal();
  return <HistoryContext.Provider value={history}>{children}</HistoryContext.Provider>;
}

const useHistory = () => useContext(HistoryContext);

export { HistoryProvider as default, useHistory };
