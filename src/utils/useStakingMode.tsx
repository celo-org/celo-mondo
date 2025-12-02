'use client';

import { createContext, PropsWithChildren, useCallback, useContext } from 'react';
import { useLocalStorage } from 'src/utils/useLocalStorage';

export type StakingMode = 'CELO' | 'stCELO';
function useStakingModeInternal() {
  // const { address } = useAccount();
  // const { stCELOBalances, isLoading: stCELOLoading } = useStCELOBalance(address);
  // const { lockedBalance, isLoading: lockedLoading } = useLockedBalance(address);
  const [mode, setMode] = useLocalStorage<StakingMode>(
    'mode',
    // stCELOBalances.total > 0 ? 'stCELO' : 'CELO',
    'CELO',
  );

  const toggleMode = useCallback(
    () => setMode((mode) => (mode === 'CELO' ? 'stCELO' : 'CELO')),
    [setMode],
  );

  // useEffect(() => {
  //   document
  //     .getElementsByTagName('html')
  //     .item(0)
  //     ?.setAttribute('data-theme', mode === 'CELO' ? 'light' : 'light-liquid');
  // }, [mode]);

  return {
    // mode,
    mode: 'CELO',
    toggleMode,
    // shouldRender: !stCELOLoading && !lockedLoading && stCELOBalances.total > 0 && lockedBalance > 0,
    shouldRender: false,
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
