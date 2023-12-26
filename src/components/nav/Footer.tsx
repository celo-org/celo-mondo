import Image from 'next/image';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { links } from 'src/config/links';
import Discord from 'src/images/logos/discord.svg';
import Github from 'src/images/logos/github.svg';
import Twitter from 'src/images/logos/twitter.svg';
import { useBlockNumber } from 'wagmi';

export function Footer() {
  return (
    <div className="flex w-full justify-between px-3 py-3 sm:px-5">
      <div className="inline-flex items-start justify-start gap-4">
        <FooterIconLink to={links.github} imgSrc={Github} alt="Github" />
        <FooterIconLink to={links.twitter} imgSrc={Twitter} alt="Twitter" />
        <FooterIconLink to={links.discord} imgSrc={Discord} alt="Discord" />
      </div>
      <div className="flex items-center space-x-1">
        <div className="text-xs text-taupe-400">
          Powered by <ExternalLink href={links.celoscan}>CeloScan</ExternalLink> and{' '}
          <ExternalLink href="https://docs.celo.org/network/node/forno">Forno</ExternalLink> |
        </div>
        <BlockNumber />
      </div>
    </div>
  );
}

function FooterIconLink({ to, imgSrc, alt }: { to: string; imgSrc: any; alt: string }) {
  return (
    <a className="relative h-5 w-5" href={to} target="_blank" rel="noopener noreferrer">
      <Image src={imgSrc} alt={alt} width={25} height={25} />
    </a>
  );
}

function BlockNumber() {
  const { data, isError } = useBlockNumber({
    watch: true,
    cacheTime: 20_000,
    staleTime: 10_000,
  });
  return <div className="text-xs">{isError ? 'Error' : data?.toString() || '...'}</div>;
}
