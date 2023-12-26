import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export function usePageInvariant(predicate: any, fallbackPath: string, errorMessage: string) {
  const [isMessageShown, setIsMessageShown] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (!predicate && !isMessageShown) {
      setIsMessageShown(true);
      toast.error(errorMessage);
      router.replace(fallbackPath);
    }
  }, [router, predicate, fallbackPath, errorMessage, isMessageShown]);
}
