import clsx from 'clsx';
import Link from 'next/link';
import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { Community } from 'src/components/icons/Community';

interface Props {
  address: `0x${string}`;
  className?: string;
  title?: string;
}
export default function ContributionBadge({ className, title = '', address }: Props) {
  const onClick = useCallback(() => {
    toast.info(
      <>
        <p>
          By either reinvesting their earnings on chain or by created apps/tools for CELO, this
          group has meaningfully impacted celo by giving back to the community.
        </p>
        <p className="underline">
          <Link
            href={`https://github.com/celo-org/celo-mondo/issues/new?title=New+community+contributor+application+${address}`}
            target="_blank"
          >
            Are you worthy of the Community badge? Apply here
          </Link>
        </p>
      </>,
      {
        autoClose: false,
      },
    );
  }, [address]);

  return (
    <OutlineButton
      className={clsx('all:py-1 all:font-normal', className)}
      title="CELO Community contributor"
      onClick={onClick}
    >
      <div className="flex items-center space-x-1.5 transition-all">
        <Community height="1rem" />
        <span>{title}</span>
      </div>
    </OutlineButton>
  );
}
