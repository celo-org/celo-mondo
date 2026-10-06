import { Metadata } from 'next';
import { BuybackDashboard } from 'src/features/buyback/components/BuybackDashboard';

const description =
  'Track the CELO buyback: Celo L2 sequencer-fee revenue accruing to the Community Fund under CELOccelerate (CGP-233).';

export const metadata: Metadata = {
  // The root layout template appends the "Celo Mondo" branding
  title: 'Buyback',
  description,
  openGraph: { title: 'Celo Mondo | Buyback', description },
  twitter: {
    title: 'Celo Mondo',
    site: '@celo',
    card: 'summary_large_image',
  },
};

export default function Page() {
  return <BuybackDashboard />;
}
