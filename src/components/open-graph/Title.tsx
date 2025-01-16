import { Color } from 'src/styles/Color';

export function Title({ baseSize, text }: { baseSize: number; text: string }) {
  return (
    <div
      style={{
        marginTop: baseSize * 0.3,
        fontSize: baseSize * 2.25,
        color: Color.Black,
        display: 'flex',
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
}

export function ExtraLarge({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 160,
        color: Color.Black,
        display: 'flex',
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
}
