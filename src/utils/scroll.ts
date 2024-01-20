import { useEffect, useState } from 'react';

export function useScrollBelowListener(threshold: number) {
  const [isScrolledBelow, setIsScrolledBelow] = useState(false);
  useEffect(() => {
    const listener = () => {
      if (window.scrollY > threshold) setIsScrolledBelow(true);
      else setIsScrolledBelow(false);
    };
    window.addEventListener('scroll', listener);
    return () => {
      window.removeEventListener('scroll', listener);
    };
  }, [threshold]);
  return isScrolledBelow;
}
