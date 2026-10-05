import { StaticImageData } from 'next/image';

export interface Bridge {
  id: string;
  name: string;
  operator: string;
  href: string;
  logo: string | StaticImageData;
  description: string;
  // Zero-based display position that overrides click-count ordering
  pinnedIndex?: number;
}
