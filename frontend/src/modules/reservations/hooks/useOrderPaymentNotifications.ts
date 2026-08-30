import { useEffect } from 'react';
import { toast } from '@/shared/components/ui/sonner';
import { getStoredToken, getStoredUser } from '@/services/authStorage';
import { orderRealtimeService } from '../services/orderRealtime.service';

// TODO(E8): also subscribe to order:status_changed once Epic E's live
// delivery-stage tracking exists — this listener only covers the
// payment-confirmation step of the flow.
/**
 * Connects an authenticated Recipient to the `payment:success` Socket.IO
 * event so a Stripe order flips to confirmed live, without a manual
 * refresh. When the event's `orderId` matches `orderId`, shows a
 * confirmation toast and calls `onConfirmed` (typically a refetch).
 */
export function useOrderPaymentNotifications(
  orderId: string | undefined,
  onConfirmed: () => void,
) {
  useEffect(() => {
    const unsubscribe = orderRealtimeService.subscribeToPaymentSuccess((event) => {
      if (event.orderId !== orderId) return;

      toast.success('Payment confirmed', {
        description: 'Your order is now in the queue.',
      });
      onConfirmed();
    });

    return unsubscribe;
  }, [orderId, onConfirmed]);

  useEffect(() => {
    const user = getStoredUser();
    const token = getStoredToken();
    const isAuthenticatedRecipient = user?.role === 'RECIPIENT' && Boolean(token);

    if (!isAuthenticatedRecipient || !token) {
      orderRealtimeService.disconnect();
      return;
    }

    orderRealtimeService.connect(token);

    return () => {
      orderRealtimeService.disconnect();
    };
  }, []);
}
