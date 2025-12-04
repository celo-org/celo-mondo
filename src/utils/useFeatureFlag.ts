import { useSearchParams } from 'next/navigation';

type Features = 'stcelo';
const features = new Set<Features>(['stcelo']);

export function useFeatureFlag(): Features | null {
  const params = useSearchParams();
  const featureFlag = params?.get('feature') || null;

  return features.has(featureFlag as Features) ? (featureFlag as Features) : null;
}
