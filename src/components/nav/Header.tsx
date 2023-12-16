import Image from 'next/image';
import Link from 'next/link';
import Celo from 'src/images/logos/celo.svg';

export function Header() {
  return (
    <header className="relative z-30 w-screen px-3 pb-5 pt-4 sm:pl-5 sm:pr-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center sm:hidden">
          <Image
            src={Celo}
            alt="Celo Station"
            quality={100}
            width={90}
            className="hidden dark:inline"
          />
        </Link>
      </div>
    </header>
  );
}
