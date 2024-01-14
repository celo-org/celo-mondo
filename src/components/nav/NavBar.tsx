import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { label: 'Staking', to: '/' },
  { label: 'Governance', to: '/governance' },
  { label: 'Bridge', to: '/bridge' },
  { label: 'Dashboard', to: '/account' },
];

export function NavBar({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <nav>
      <ul className="flex list-none items-center justify-center space-x-6">
        {LINKS.map((l) => {
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
                    collapsed ? '-bottom-3.5' : '-bottom-5'
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
