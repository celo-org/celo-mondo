import { SVGProps } from 'react';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { Discord } from 'src/components/logos/Discord';
import { Github } from 'src/components/logos/Github';
import { Twitter } from 'src/components/logos/Twitter';
import { Web } from 'src/components/logos/Web';
import { SocialLinkType } from 'src/config/types';

interface Props {
  type: SocialLinkType;
  svgProps?: SVGProps<SVGSVGElement>;
  size?: number;
  className?: string;
}

const LOGOS: Record<SocialLinkType, React.FC<any>> = {
  [SocialLinkType.Website]: Web,
  [SocialLinkType.Twitter]: Twitter,
  [SocialLinkType.Github]: Github,
  [SocialLinkType.Discord]: Discord,
};

export function SocialLogo({ svgProps, type, className, size = 18 }: Props) {
  const Logo = LOGOS[type];
  if (!Logo) throw new Error(`No logo for type ${type}`);

  return (
    <span title={type} className={className}>
      <Logo {...svgProps} width={size} height={size} />
    </span>
  );
}

export function SocialLogoLink({ href, ...rest }: Props & { href: string }) {
  return (
    <A_Blank href={href} onClick={(e) => e.stopPropagation()}>
      <SocialLogo {...rest} />
    </A_Blank>
  );
}
