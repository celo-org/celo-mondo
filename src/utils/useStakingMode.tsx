'use client';

import { createContext, PropsWithChildren, useCallback, useContext, useEffect } from 'react';
import { useLockedBalance, useStCELOBalance } from 'src/features/account/hooks';
import { useFeatureFlag } from 'src/utils/useFeatureFlag';
import { useSessionStorage } from 'src/utils/useSessionStorage';
import { useAccount, useBalance } from 'wagmi';

export type StakingMode = 'CELO' | 'stCELO';
function useStakingModeInternal() {
  const featureFlag = useFeatureFlag();
  const enabled = featureFlag === 'stcelo';

  const { address } = useAccount();
  const { stCELOBalances } = useStCELOBalance(address);
  const { data: balance } = useBalance({ address });
  const { lockedBalance } = useLockedBalance(address);
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

  const hasAtLeastTwoPositiveBalances =
    [stCELOBalances.total, balance?.value ?? 0n, lockedBalance].filter((x) => x > 0).length >= 2;

  return {
    mode,
    toggleMode,
    shouldRender: hasAtLeastTwoPositiveBalances,
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
