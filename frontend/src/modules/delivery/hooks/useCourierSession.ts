import { useEffect } from 'react';
import { getStoredToken } from '@/services/authStorage';
import { courierRealtimeService } from '../services/courierRealtime.service';

/**
 * Stops any in-progress GPS watch/ping loop on logout.
 *
 * The socket connection itself is centralized (useRealtimeConnection,
 * mounted once at the app root) and survives navigation regardless of role,
 * so this hook no longer owns it — previously, disconnecting the socket on
 * logout also implicitly stopped tracking (courierRealtime.service.ts's old
 * disconnect() called stopTracking()); that coupling is now made explicit
 * here instead, since centralizing the socket removed it.
 */
export function useCourierSession() {
  const token = getStoredToken();

  useEffect(() => {
    if (!token) {
      courierRealtimeService.stopTracking();
    }
  }, [token]);
}

export default useCourierSession;
