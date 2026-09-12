import { useEffect } from 'react';
import { getStoredToken } from '@/services/authStorage';
import { courierRealtimeService } from '../services/courierRealtime.service';

/**
 * Keeps the Courier's socket open for as long as they are signed in.
 *
 * This lives in the navigation component, which stays mounted across both
 * Courier pages. Putting it in a page would disconnect the socket on
 * navigation and kill the ping loop mid-delivery (spec D2).
 */
export function useCourierSession() {
  const token = getStoredToken();

  useEffect(() => {
    if (!token) {
      courierRealtimeService.disconnect();
      return;
    }

    courierRealtimeService.connect(token);

    return () => {
      courierRealtimeService.disconnect();
    };
  }, [token]);
}

export default useCourierSession;
