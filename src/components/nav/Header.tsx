import Link from 'next/link';
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
        <MobileNavDropdown className="block md:hidden" />
        <Link href="/" className="hidden items-center md:flex">
          <CeloLogo width={110} height={26} />
        </Link>
        <div className="hidden md:block">
          <NavBar collapsed={collapseHeader} />
        </div>
        <WalletDropdown />
      </div>
    </header>
  );
}
