import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { CeloGlyph } from 'src/components/logos/Celo';
import { DropdownMenu } from 'src/components/menus/Dropdown';
// import Bridge from 'src/images/icons/bridge.svg';
import Dashboard from 'src/images/icons/dashboard.svg';
import Delegate from 'src/images/icons/delegate.svg';
import Governance from 'src/images/icons/governance.svg';
import Staking from 'src/images/icons/staking.svg';
import { useAccount } from 'wagmi';

const LINKS = (isWalletConnected?: boolean) => [
  { label: 'Staking', to: '/', icon: Staking },
  { label: 'Governance', to: '/governance', icon: Governance },
  { label: 'Delegate', to: '/delegate', icon: Delegate },
  // { label: 'Bridge', to: '/bridge', icon: Bridge },
  ...(isWalletConnected ? [{ label: 'Dashboard', to: '/account', icon: Dashboard }] : []),
];

export function NavBar({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { address } = useAccount();

  return (
    <nav>
      <ul className="flex list-none items-center justify-center space-x-6">
        {LINKS(!!address).map((l) => {
          return (
            <div key={l.label} className="relative">
              <li
                className={clsx(
                  'flex items-center justify-center transition-all hover:opacity-100',
                  l.to === pathname ? 'font-semibold opacity-100' : 'font-medium opacity-60',
                )}
              >
                <Link href={l.to}>{l.label}</Link>
              </li>
              {l.to === pathname && (
                <div
                  className={`absolute h-0.5 w-full bg-black transition-all duration-500 ${
                    collapsed ? '-bottom-3' : '-bottom-[1.15rem]'
                  }`}
                ></div>
              )}
            </div>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileNavDropdown({ className }: { className?: string }) {
  const { address } = useAccount();

  return (
    <nav className={className}>
      <DropdownMenu
        button={
          <div className="flex items-center justify-center space-x-3 border-r border-taupe-300 pb-1 pr-3 pt-1.5">
            <CeloGlyph width={26} height={26} />
            <ChevronIcon direction="s" width={16} height={16} className="pt-1" />
          </div>
        }
        menuClasses="space-y-8 py-6 px-8"
        menuItems={LINKS(!!address).map((l) => {
          return (
            <Link key={l.label} href={l.to} className="flex space-x-4 font-medium">
              <Image src={l.icon} height={20} width={20} alt="" />
              <span>{l.label}</span>
            </Link>
          );
        })}
      />
    </nav>
  );
}
