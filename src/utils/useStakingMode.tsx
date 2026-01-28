'use client';

import { createContext, PropsWithChildren, useCallback, useContext, useEffect } from 'react';
import { useStCELOBalance } from 'src/features/account/hooks';
import { useFeatureFlag } from 'src/utils/useFeatureFlag';
import { useSessionStorage } from 'src/utils/useSessionStorage';
import { useAccount, useBalance } from 'wagmi';

export type StakingMode = 'CELO' | 'stCELO';
function useStakingModeInternal() {
  const featureFlag = useFeatureFlag();
  const enabled = featureFlag === 'stcelo';

  const { address } = useAccount();
  const { stCELOBalances, isLoading: stCELOLoading } = useStCELOBalance(address);
  const { data: balance, isLoading: balanceLoading } = useBalance({ address });
  const [mode, setMode] = useSessionStorage<StakingMode>(
    'mode',
    enabled && stCELOBalances.total > 0 ? 'stCELO' : 'CELO',
  );

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
      !stCELOLoading && !balanceLoading && stCELOBalances.total > 0 && (balance?.value ?? 0n) > 0,
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
