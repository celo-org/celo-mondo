import { FallBack, OpenGraphImage } from 'src/app/twitter-image';

export { contentType, size } from 'src/app/twitter-image';
export const runtime = 'edge';

export const alt = 'Celo Mondo | Account';
export default function Image() {
  return OpenGraphImage({ children: <FallBack /> });
}
