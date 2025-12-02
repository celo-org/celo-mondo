import { MouseEvent, PropsWithChildren, useCallback } from 'react';
import { TextLink } from 'src/components/buttons/TextLink';
import { ArrowIcon } from 'src/components/icons/Arrow';
import { Color } from 'src/styles/Color';
import { useHistory } from 'src/utils/useHistory';

interface Props {
  href: string;
  className?: string;
}

export function BackLink({ href, className, children }: PropsWithChildren<Props>) {
  const { back } = useHistory();
  const onClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => back() && event.preventDefault(),
    [back],
  );
  return (
    <TextLink onClick={onClick} href={href} className={`font-medium text-taupe-600 ${className}`}>
      <div className="flex items-center text-sm">
        <ArrowIcon width={20} height={20} direction="w" fill={Color.Wood} />
        <span>{children}</span>
      </div>
    </TextLink>
  );
}
