import Link from 'next/link';
import { ModeToggle } from 'src/features/mode/ModeToggle';
import { WalletDropdown } from 'src/features/wallet/WalletDropdown';
import { useScrollBelowListener } from 'src/utils/scroll';
import { CeloLogo } from '../logos/Celo';
import { MobileNavDropdown, NavBar } from './NavBar';

export function Header() {
  const collapseHeader = useScrollBelowListener(60);

  return (
    <header
      className={`sticky top-0 z-20 w-full border-b border-taupe-300 bg-taupe-100 px-3 transition-all duration-500 ease-in-out sm:px-5 ${
        collapseHeader ? 'py-1' : 'py-2 sm:py-2.5'
      }`}
    >
      <div className="flex items-center justify-between">
        {/*
          The inline nav needs about 575px for its seven links once a wallet is
          connected, next to the logo and the mode and wallet controls. That only
          fits from xl; below it the links would be clipped with no other way to
          reach them, so the dropdown menu stays until then.
        */}
        <MobileNavDropdown className="block xl:hidden" />
        <Link href="/" className="hidden items-center xl:flex">
          <CeloLogo width={110} height={26} />
        </Link>
        <div className="hidden min-w-0 xl:block">
          <NavBar collapsed={collapseHeader} />
        </div>
        <div className="flex shrink-0 flex-row items-center justify-center gap-2 sm:gap-4">
          <ModeToggle />
          <WalletDropdown />
        </div>
      </div>
    </header>
  );
}
