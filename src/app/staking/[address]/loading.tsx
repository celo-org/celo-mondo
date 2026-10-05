import { FullWidthSpinner } from 'src/components/animation/Spinner';

// Streamed immediately on navigation while the validator page renders on the
// server (first, uncached visit of an address)
export default function Loading() {
  return <FullWidthSpinner>Loading validator data</FullWidthSpinner>;
}
