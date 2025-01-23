import { CSSProperties } from 'react';
import { Color } from 'src/styles/Color';

export function Background({
  children,
  direction = 'v',
}: {
  children: React.ReactNode;
  direction?: 'h' | 'v';
}) {
  const style: CSSProperties =
    direction === 'v'
      ? {
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }
      : {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
        };
  return (
    <div
      style={{
        color: Color.Black,
        background: Color.Sand,
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        // slightly bias away from bottom as twitter puts text there
        paddingBottom: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
