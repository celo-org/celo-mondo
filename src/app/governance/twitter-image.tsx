import { OpenGraphImage } from 'src/app/twitter-image';
import { BasePage } from 'src/components/open-graph/BasePage';
export { contentType, size } from 'src/app/twitter-image';
export const runtime = 'edge';

export const alt = 'Celo Governance';
export default function Image() {
  return OpenGraphImage({ children: <BasePage title="Governance" /> });
}
