import { useRealtimeConnection } from '@/shared/hooks/useRealtimeConnection';
import { useLiveNotificationToasts } from '@/modules/notifications/hooks/useLiveNotificationToasts';

/**
 * Owns the app's one live-notification pipeline: opens the shared socket
 * connection and dispatches registry-driven toasts. Renders nothing —
 * mount once, at the app root, alongside <Toaster />.
 */
export function LiveNotifications() {
  useRealtimeConnection();
  useLiveNotificationToasts();
  return null;
}

export default LiveNotifications;
