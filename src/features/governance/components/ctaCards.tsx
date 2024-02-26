import Image from 'next/image';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { links } from 'src/config/links';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import BookIcon from 'src/images/icons/book.svg';
import LockIcon from 'src/images/icons/lock.svg';
import CeloIcon from 'src/images/logos/celo.svg';
import DiscordIcon from 'src/images/logos/discord.svg';

export function GetInvolvedCtaCard() {
  return (
    <div className="flex w-fit flex-col space-y-2 border border-taupe-300 bg-taupe-100 bg-diamond-texture bg-right-bottom bg-no-repeat py-2.5 pl-4 pr-8 md:pr-14">
      <h2 className="font-serif text-xl">Get Involved</h2>
      <ExternalLink
        href={links.docs}
        className="flex items-center space-x-2 text-sm font-medium hover:underline"
      >
        <div className="w-4">
          <Image src={BookIcon} alt="" />
        </div>
        <span>Explore the docs</span>
      </ExternalLink>
      <ExternalLink
        href={links.discord}
        className="flex items-center space-x-2 text-sm font-medium hover:underline"
      >
        <div className="w-4">
          <Image src={DiscordIcon} alt="" />
        </div>
        <span>Join the chat</span>
      </ExternalLink>
      <ExternalLink
        href={links.forum}
        className="flex  items-center space-x-2 text-sm font-medium hover:underline"
      >
        <div className="w-4 p-px">
          <Image src={CeloIcon} alt="" />
        </div>
        <span>Join the forum</span>
      </ExternalLink>
    </div>
  );
}

export function NoFundsLockedCtaCard() {
  const showTxModal = useTransactionModal(TransactionFlowType.Lock);

  return (
    <div className="flex items-center justify-between space-x-6 border border-taupe-300 bg-white bg-diamond-texture bg-right-bottom bg-no-repeat px-3 py-4 md:px-5 md:py-6">
      <div className="space-y-2">
        <h3 className="font-serif text-xl sm:text-2xl">{`You can’t participate in governance, yet.`}</h3>
        <p className="text-sm sm:text-base">
          Lock CELO to vote on proposals and stake with validators.
        </p>
      </div>
      <SolidButton onClick={() => showTxModal()}>
        <div className="flex items-center space-x-1.5">
          <Image src={LockIcon} width={10} height={10} alt="" />
          <span>Lock</span>
        </div>
      </SolidButton>
    </div>
  );
}
