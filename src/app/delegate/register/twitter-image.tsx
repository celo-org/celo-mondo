import { OpenGraphImage } from 'src/app/twitter-image';
import { BasePage } from 'src/components/open-graph/BasePage';
export { contentType, size } from 'src/app/twitter-image';
export const runtime = 'edge';

export const alt = 'Delegate Registration';
export default function Image() {
  return OpenGraphImage({ children: <BasePage title="Become a Delegate" /> });
}
