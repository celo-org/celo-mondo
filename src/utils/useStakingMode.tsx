'use client';

import { createContext, PropsWithChildren, useCallback, useContext, useEffect } from 'react';
import { useStCELOBalance } from 'src/features/account/hooks';
import { useWithdrawalBot } from 'src/features/staking/stCELO/hooks/useWithdrawals';
import { useSessionStorage } from 'src/utils/useSessionStorage';
import { useAccount } from 'wagmi';

export type StakingMode = 'CELO' | 'stCELO';
function useStakingModeInternal() {
  const { address } = useAccount();
  const { stCELOBalances } = useStCELOBalance(address);
  const [mode, setMode] = useSessionStorage<StakingMode>(
    'mode',
    stCELOBalances.total > 0 ? 'stCELO' : 'CELO',
  );

  useWithdrawalBot(address);

  const toggleMode = useCallback(
    () => setMode((mode) => (mode === 'CELO' ? 'stCELO' : 'CELO')),
    [setMode],
  );

  const selectMode = useCallback((newMode: StakingMode) => setMode(newMode), [setMode]);

  useEffect(() => {
    document
      .getElementsByTagName('html')
      .item(0)
      ?.setAttribute('data-theme', mode === 'CELO' ? 'light' : 'light-liquid');
  }, [mode]);

  return {
    mode,
    toggleMode,
    selectMode,
    shouldRender: true,
    ui: {
      action: (mode === 'stCELO' ? 'Liquid ' : '') + 'Stake',
      participle: (mode === 'stCELO' ? 'Liquid ' : '') + 'Staking',
    },
  };
}

const StakingModeContext = createContext<ReturnType<typeof useStakingModeInternal>>({
  mode: 'CELO',
  shouldRender: true,
  toggleMode: () => null,
  selectMode: () => null,
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
