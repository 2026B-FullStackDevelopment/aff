// Connects the shared Socket.IO singleton whenever a user is authenticated,
// disconnects otherwise. Mounted once, at the app root (see LiveNotifications).
//
// There is no reactive auth context in this codebase — getStoredUser()/
// getStoredToken() are plain localStorage reads — so useLocation() is called
// purely to force this hook to re-evaluate on every route change (e.g. the
// post-login redirect), matching the existing pattern this replaces.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getStoredToken, getStoredUser } from '@/services/authStorage';
import { realtimeSocket } from '../services/realtimeSocket';

export function useRealtimeConnection() {
  useLocation();
  const user = getStoredUser();
  const token = getStoredToken();

  useEffect(() => {
    if (!user || !token) {
      realtimeSocket.disconnect();
      return;
    }

    realtimeSocket.connect(token);

    return () => {
      realtimeSocket.disconnect();
    };
  }, [token, user?.id, user?.role]);
}

export default useRealtimeConnection;
