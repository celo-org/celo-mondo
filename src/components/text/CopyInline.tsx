import { ButtonHTMLAttributes } from 'react';
import { useCopyHandler } from 'src/utils/clipboard';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string;
};

export function CopyInline({ text, ...props }: Props) {
  const onClick = useCopyHandler(text);
  return (
    <button type="button" onClick={onClick} title="Copy" {...props}>
      {text}
    </button>
  );
}
