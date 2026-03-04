import clsx from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { useStakingMode } from 'src/utils/useStakingMode';
import { useTrackEvent } from 'src/utils/useTrackEvent';

export function ModeToggle() {
  const { mode, shouldRender, selectMode } = useStakingMode();
  const trackEvent = useTrackEvent();

  const celoRef = useRef<HTMLButtonElement>(null);
  const stCeloRef = useRef<HTMLButtonElement>(null);
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const [enableTransition, setEnableTransition] = useState(false);

  const updatePillStyle = useCallback(() => {
    const activeRef = mode === 'CELO' ? celoRef.current : stCeloRef.current;
    if (activeRef) {
      setPillStyle({ left: activeRef.offsetLeft, width: activeRef.offsetWidth });
    }
  }, [mode]);

  useLayoutEffect(() => {
    updatePillStyle();
  }, [updatePillStyle]);

  useEffect(() => {
    const handleResize = () => updatePillStyle();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePillStyle]);

  useEffect(() => {
    setEnableTransition(true);
  }, []);

  const handleSelect = useCallback(
    (newMode: 'CELO' | 'stCELO') => {
      trackEvent('mode_toggled', { mode: newMode });
      selectMode(newMode);
    },
    [selectMode, trackEvent],
  );

  return (
    <div className={clsx('flex items-center', !shouldRender && 'hidden')}>
      <div className="relative flex whitespace-nowrap rounded-full bg-taupe-300 p-0.5">
        {/* Sliding background pill */}
        {pillStyle && (
          <div
            className={clsx(
              'absolute bottom-0.5 top-0.5 rounded-full',
              enableTransition && 'transition-all duration-300 ease-in-out',
              mode === 'CELO' ? 'bg-yellow-500' : 'bg-purple-300',
            )}
            style={{ left: pillStyle.left, width: pillStyle.width }}
          />
        )}
        <button
          ref={celoRef}
          onClick={() => handleSelect('CELO')}
          className={clsx(
            'relative z-10 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors duration-300 sm:px-4',
            mode === 'CELO' ? 'text-black' : 'text-taupe-600 hover:text-black',
          )}
        >
          Stake
        </button>
        <button
          ref={stCeloRef}
          onClick={() => handleSelect('stCELO')}
          className={clsx(
            'relative z-10 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors duration-300 sm:px-4',
            mode === 'stCELO' ? 'text-white' : 'text-taupe-600 hover:text-black',
          )}
        >
          Liquid Stake
          <HelpIcon
            type="tooltip"
            text="Toggle Mondo to use your liquid staked Celo positions vs regular staked Celo positions."
            size={14}
            position="below"
            align="right"
          />
        </button>
      </div>
    </div>
  );
}
