'use client';

import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';

export function useSessionStorage<T>(
  key: string,
  initialValue: T,
): readonly [storedValue: T, setValue: Dispatch<SetStateAction<T>>, removeValue: () => void] {
  const serializer = useCallback<(value: T) => string>((value) => JSON.stringify(value), []);
  const deserializer = useCallback<(value: string) => T>(
    (value) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing JSON:', error);
        return initialValue;
      }

      return parsed as T;
    },
    [initialValue],
  );

  const readValue = useCallback((): T => {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? deserializer(raw) : initialValue;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Error reading sessionStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [key, deserializer, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(initialValue);

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      try {
        const newValue = value instanceof Function ? value(readValue()!) : value;
        window.sessionStorage.setItem(key, serializer(newValue));
        setStoredValue(newValue);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Error setting sessionStorage key “${key}”:`, error);
      }
    },
    [key, readValue, serializer],
  );

  const removeValue = useCallback(() => {
    window.sessionStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [initialValue, key]);

  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [storedValue, setValue, removeValue];
}
