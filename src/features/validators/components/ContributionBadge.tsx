import clsx from 'clsx';
import Link from 'next/link';
import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { Community } from 'src/components/icons/Community';
import './ContributionBadge.css';

interface Props {
  className?: string;
  title?: string;
  asButton?: true;
}
export default function ContributionBadge({ className, title = '', asButton }: Props) {
  const onClick = useCallback(() => {
    toast.info(
      <div className='flex flex-col gap-2'>
        <p>
          By either reinvesting their earnings on chain or by created apps/tools for CELO, this
          group has meaningfully impacted celo by giving back to the community.
        </p>
        <p className="underline">
          <Link
            href={`https://github.com/celo-org/celo-mondo/issues/new?title=New+community+contributor+application+[HERE_YOUR_VALIDATOR_GROUP_ADDRESS]`}
            target="_blank"
          >
            Are you worthy of the Community badge? Apply here
          </Link>
        </p>
      </div>,
      {
        autoClose: false,
      },
    );
  }, []);

  if (asButton) {
    return (
      <OutlineButton
        className={clsx('all:py-1 all:font-normal', className)}
        title={title}
        onClick={onClick}
      >
        <div className="flex items-center space-x-1.5 transition-all">
          <Community height="1rem" /> {/* .85rem is text-sm */}
          <span>{title}</span>
        </div>
      </OutlineButton>
    );
  }

  return (
    <div className="highlighted group flex items-center">
      <span className="inset-ring inset-ring-gray-400/20 inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400">
        {title}
      </span>
    </div>
  );
}
