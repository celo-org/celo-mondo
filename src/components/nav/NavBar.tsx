import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { label: 'Staking', to: '/staking' },
  { label: 'Governance', to: '/governance' },
  { label: 'Bridge', to: '/bridge' },
  { label: 'My Account', to: '/account' },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav>
      <ul className="flex list-none items-center justify-center space-x-6">
        {LINKS.map((l) => {
          return (
            <li
              key={l.label}
              className={clsx(
                'flex items-center justify-center',
                l.to === pathname ? 'font-semibold opacity-100' : 'opacity-70',
              )}
            >
              <Link href={l.to}>{l.label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
