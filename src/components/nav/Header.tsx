import Link from 'next/link';
import { WalletDropdown } from 'src/features/wallet/WalletDropdown';
import { useScrollBelowListener } from 'src/utils/scroll';
import { CeloGlyph, CeloLogo } from '../logos/Celo';
import { NavBar } from './NavBar';

export function Header() {
  const collapseHeader = useScrollBelowListener(60);

  return (
    <header
      className={`sticky top-0 z-10 w-full border-b border-taupe-300 bg-taupe-100 px-3 transition-all duration-500 ease-in-out sm:px-5 ${
        collapseHeader ? 'py-1' : 'py-2.5'
      }`}
    >
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center md:hidden">
          <CeloGlyph width={26} height={26}></CeloGlyph>
        </Link>
        <Link href="/" className="hidden items-center md:flex">
          <CeloLogo width={110} height={26}></CeloLogo>
        </Link>
        <div className="hidden md:block">
          <NavBar collapsed={collapseHeader} />
        </div>
        <WalletDropdown />
      </div>
    </header>
  );
}
