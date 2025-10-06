import { A_Blank } from 'src/components/buttons/A_Blank';
import { SocialLogoLink } from 'src/components/logos/SocialLogo';
import { config } from 'src/config/config';
import { links } from 'src/config/links';
import { SocialLinkType } from 'src/config/types';
import { useBlockNumber } from 'wagmi';

export function Footer() {
  return (
    <div className="mt-2 flex w-full justify-between px-3 py-3 sm:px-5">
      <div className="inline-flex items-start justify-start gap-4">
        <FooterIconLink href={links.github} type={SocialLinkType.Github} />
        <FooterIconLink href={links.twitter} type={SocialLinkType.Twitter} />
        <FooterIconLink href={links.discord} type={SocialLinkType.Discord} />
        <FooterIconLink href={links.bug} type={SocialLinkType.Bug} />
      </div>
      <div className="flex items-center space-x-1">
        <div className="text-xs text-taupe-400">
          Powered by <A_Blank href={`${links.blockscoutApi}-docs`}>CeloBlockscout</A_Blank> and{' '}
          <A_Blank href="https://docs.celo.org/network/node/forno">Forno</A_Blank>
        </div>
        {config.watchBlockNumber && <BlockNumber />}
      </div>
    </div>
  );
}

function FooterIconLink({ type, href }: { type: SocialLinkType; href: string }) {
  return <SocialLogoLink type={type} href={href} size={18} className="h-4 w-4" />;
}

function BlockNumber() {
  const { data, isError } = useBlockNumber({
    watch: true,
  });

  return <div className="text-xs">{isError ? 'Error' : data?.toString() || '...'}</div>;
}
