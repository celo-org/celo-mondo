import Image from 'next/image';
import { links } from 'src/config/links';
import Moon from 'src/images/icons/moon.svg';
import Sun from 'src/images/icons/sun.svg';
import Discord from 'src/images/logos/discord.svg';
import Github from 'src/images/logos/github.svg';
import Twitter from 'src/images/logos/twitter.svg';
import { useDarkMode } from 'src/styles/mediaQueries';

export function Footer() {
  return (
    <div className="z-20 inline-flex w-full justify-between p-3 sm:px-5 sm:py-7">
      <div className="inline-flex items-start justify-start gap-4">
        <div className="flex items-start justify-start gap-2.5 p-2">
          <FooterIconLink to={links.twitter} imgSrc={Twitter} alt="Twitter" />
        </div>
        <div className="flex items-start justify-start gap-2.5 p-2">
          <FooterIconLink to={links.github} imgSrc={Github} alt="Github" />
        </div>
        <div className="flex items-start justify-start gap-2.5 p-2">
          <FooterIconLink to={links.discord} imgSrc={Discord} alt="Discord" />
        </div>
      </div>
      <ThemeToggle />
    </div>
  );
}

function ThemeToggle() {
  const { isDarkMode, setDarkMode } = useDarkMode();
  return (
    <div
      className="inline-flex cursor-pointer items-center justify-start gap-3"
      onClick={() => setDarkMode(!isDarkMode)}
    >
      <div className="text-[15px] font-normal leading-tight text-gray-950 dark:text-neutral-400">
        Theme
      </div>
      <div className="trainsition-color dark:bg-fuchsia-200 relative flex items-center justify-center gap-[5px] rounded-[32px] border border border border border-gray-950 px-0.5 py-[1px]">
        <div className="relative flex h-5 w-4 flex-col items-start justify-start p-1 pr-0">
          <Image src={Sun} alt="light theme icon" width={14} height={14} />
        </div>
        <div className="relative flex h-5 w-4 flex-col items-start justify-start py-1 pr-1">
          <Image src={Moon} alt="dark theme icon" width={14} height={14} />
        </div>
        <div
          className={`absolute left-[2px] h-[18px] w-[18px] transform rounded-full border border-gray-950 bg-gray-950 transition ${
            isDarkMode && 'translate-x-[19px]'
          }`}
        />
      </div>
    </div>
  );
}

function FooterIconLink({ to, imgSrc, alt }: { to: string; imgSrc: any; alt: string }) {
  return (
    <a className="relative h-6 w-6 dark:invert" href={to} target="_blank" rel="noopener noreferrer">
      <Image src={imgSrc} alt={alt} width={25} height={25} />
    </a>
  );
}
