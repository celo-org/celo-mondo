'use client';

import { createContext, PropsWithChildren, useCallback, useContext, useEffect } from 'react';
import { useLockedBalance, useStCeloBalance } from 'src/features/account/hooks';
import { useLocalStorage } from 'src/utils/useLocalStorage';

type Mode = 'CELO' | 'stCELO';
function useStakingModeInternal() {
  const { stCeloBalance, isLoading: stCeloLoading } = useStCeloBalance();
  const { lockedBalance, isLoading: lockedLoading } = useLockedBalance();
  const [mode, setMode] = useLocalStorage<Mode>('mode', stCeloBalance ? 'stCELO' : 'CELO');

  const toggleMode = useCallback(
    () => setMode((mode) => (mode === 'CELO' ? 'stCELO' : 'CELO')),
    [setMode],
  );

  useEffect(() => {
    document
      .getElementsByTagName('html')
      .item(0)
      ?.setAttribute('data-theme', mode === 'CELO' ? 'light' : 'light-liquid');
  }, [mode]);

  return {
    mode,
    toggleMode,
    shouldRender:
      true ||
      (!stCeloLoading && !lockedLoading && (stCeloBalance || 0) > 0 && (lockedBalance || 0) > 0),
    ui: {
      action: (mode === 'stCELO' ? 'Liquid ' : '') + 'Stake',
      participle: (mode === 'stCELO' ? 'Liquid ' : '') + 'Staking',
    },
  };
}

const StakingModeContext = createContext<ReturnType<typeof useStakingModeInternal>>({
  mode: 'CELO',
  shouldRender: false,
  toggleMode: () => null,
  ui: {
    action: 'Stake',
    participle: 'Staking',
  },
});

function StakingModeProvider({ children }: PropsWithChildren) {
  const stakingMode = useStakingModeInternal();
  return <StakingModeContext.Provider value={stakingMode}>{children}</StakingModeContext.Provider>;
}

const useStakingMode = () => useContext(StakingModeContext);

export { StakingModeProvider as default, useStakingMode };
