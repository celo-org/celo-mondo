import { ButtonHTMLAttributes } from 'react';
import { useCopyHandler } from 'src/utils/clipboard';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string;
  textToCopy?: string;
};

export function CopyInline({ text, textToCopy = text, ...props }: Props) {
  const onClick = useCopyHandler(textToCopy);
  return (
    <button type="button" onClick={onClick} title="Copy" {...props}>
      {text}
    </button>
  );
}
