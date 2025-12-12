import { ButtonHTMLAttributes, ReactNode } from 'react';
import { useCopyHandler } from 'src/utils/clipboard';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  text: ReactNode;
  textToCopy: string;
};

export function CopyInline({ text, textToCopy, ...props }: Props) {
  const onClick = useCopyHandler(textToCopy);
  return (
    <button type="button" onClick={onClick} title="Copy" {...props}>
      {text}
    </button>
  );
}
