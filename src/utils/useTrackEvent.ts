import { useCallback, useEffect, useState } from 'react';
import { AnalyticsEventMap, AnalyticsEventName } from 'src/types/analytics';
import { v4 as uuidv4, validate as validateUUID } from 'uuid';
import { trackEvent } from './analytics';

const SESSION_STORAGE_KEY = 'analytics_session_id';

// React hook for analytics tracking with session management
export function useTrackEvent() {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get existing session ID or create new one
    let storedSessionId = '';
    try {
      const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      storedSessionId = stored || '';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Error reading sessionStorage:', error);
    }

    // Validate stored session ID
    if (!storedSessionId || !validateUUID(storedSessionId)) {
      // Generate new session ID and store it
      const newSessionId = uuidv4();
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
        setSessionId(newSessionId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Error setting sessionStorage:', error);
        setSessionId(newSessionId);
      }
    } else {
      setSessionId(storedSessionId);
    }
  }, []);

  const track = useCallback(
    <T extends AnalyticsEventName>(eventName: T, properties: AnalyticsEventMap[T]) => {
      return trackEvent(eventName, properties, sessionId);
    },
    [sessionId],
  );

  return track;
}
