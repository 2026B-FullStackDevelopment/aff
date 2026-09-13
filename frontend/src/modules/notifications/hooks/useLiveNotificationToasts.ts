// Subscribes every NOTIFICATION_REGISTRY row that applies to the current
// user's role, and shows the matching toast (with sound, where the row
// asks for it) when that row's event fires on the shared socket. Mounted
// once, at the app root (see LiveNotifications) — replaces the toast/sound
// dispatch previously hand-written inside useSoldOutNotifications.ts.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/shared/components/ui/sonner';
import { getStoredUser } from '@/services/authStorage';
import { soldOutAlertSoundService } from '@/modules/donations/services/soldOutAlertSound.service';
import { realtimeSocket } from '@/shared/services/realtimeSocket';
import { NOTIFICATION_REGISTRY } from '../notificationRegistry';

export function useLiveNotificationToasts() {
  const role = getStoredUser()?.role;
  const navigate = useNavigate();

  useEffect(() => {
    function prepareSound() {
      soldOutAlertSoundService.prepare();
    }

    window.addEventListener('pointerdown', prepareSound, { once: true });
    window.addEventListener('keydown', prepareSound, { once: true });

    return () => {
      window.removeEventListener('pointerdown', prepareSound);
      window.removeEventListener('keydown', prepareSound);
    };
  }, []);

  useEffect(() => {
    const entries = NOTIFICATION_REGISTRY.filter((entry) => role && entry.roles.includes(role));

    const unsubscribes = entries.map((entry) =>
      realtimeSocket.on<Record<string, unknown>>(entry.event, (payload) => {
        const { variant, title, description, duration } = entry.toast(payload);
        const action = entry.getLink
          ? { label: 'View listing', onClick: () => navigate(entry.getLink!(payload)) }
          : undefined;

        toast[variant](title, { description, duration, action });

        if (entry.sound) {
          soldOutAlertSoundService.play();
        }
      }),
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [role, navigate]);
}

export default useLiveNotificationToasts;
