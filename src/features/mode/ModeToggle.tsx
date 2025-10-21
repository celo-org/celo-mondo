import clsx from 'clsx';
import { useStakingMode } from 'src/utils/useStakingMode';

export function ModeToggle() {
  const { mode, ui, shouldRender, toggleMode } = useStakingMode();

  return (
    <div className={clsx('flex w-[120px] flex-col items-center', !shouldRender && 'hidden')}>
      <span className="text-md font-serif">{ui.participle}</span>
      <div className="relative flex justify-end">
        <input
          type="checkbox"
          id="modeToggle"
          className="peer sr-only"
          checked={mode === 'stCELO'}
          onChange={toggleMode}
        />
        <label
          htmlFor="modeToggle"
          className="relative block h-8 w-14 rounded-full bg-taupe-400 transition-colors [-webkit-tap-highlight-color:transparent] peer-checked:bg-purple-300"
        />
        <span className="pointer-events-none absolute inset-y-0 start-0 m-1 size-6 rounded-full bg-white transition-[inset-inline-start] peer-checked:start-6" />
      </div>
    </div>
  );
}
