import { StaticImageData } from 'next/image';

export interface Bridge {
  id: string;
  name: string;
  operator: string;
  href: string;
  logo: string | StaticImageData;
  description: string;
}
