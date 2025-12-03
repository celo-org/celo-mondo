import { useSearchParams } from 'next/navigation';

export function useFeatureFlag() {
  const params = useSearchParams();
  const featureFlag = params.get('feature');

  return featureFlag;
}
