import Link from 'next/link';
import { WalletDropdown } from 'src/features/wallet/WalletDropdown';
import { CeloGlyph, CeloLogo } from '../logos/Celo';
import { NavBar } from './NavBar';

export function Header() {
  return (
    <header className="relative z-30 w-screen px-3 pb-5 pt-4 sm:pl-5 sm:pr-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center md:hidden">
          <CeloGlyph width={30} height={30}></CeloGlyph>
        </Link>
        <Link href="/" className="hidden items-center md:flex">
          <CeloLogo width={140} height={30}></CeloLogo>
        </Link>
        <div className="hidden md:block">
          <NavBar />
        </div>
        <WalletDropdown />
      </div>
    </header>
  );
}
