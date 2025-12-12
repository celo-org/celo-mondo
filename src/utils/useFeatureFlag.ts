import { useSearchParams } from 'next/navigation';

type Features = 'stcelo';
const features = new Set<Features>(['stcelo']);

export function useFeatureFlag(): Features | null {
  const params = useSearchParams();
  let featureFlag = params?.get('feature') || null;
  if (featureFlag === null) {
    featureFlag = sessionStorage.getItem('feature');
  } else {
    sessionStorage.setItem('feature', featureFlag);
  }

  return features.has(featureFlag as Features) ? (featureFlag as Features) : null;
}
