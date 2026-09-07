import { useEffect } from 'react';
import { toast } from '@/shared/components/ui/sonner';
import { getStoredToken, getStoredUser } from '@/services/authStorage';
import { orderRealtimeService } from '../services/orderRealtime.service';

// TODO(E8): also subscribe to order:status_changed once Epic E's live
// delivery-stage tracking exists — this listener only covers payment
// confirmation and refund confirmation, not general delivery progress.
/**
 * Connects an authenticated Recipient to the Recipient-scoped Socket.IO
 * events so an order's payment/refund state updates live, without a manual
 * refresh:
 *  - `payment:success`: a Stripe order's checkout completed (D2).
 *  - `payment:refunded`: a cancelled Stripe order's refund was confirmed by
 *    the `charge.refunded` webhook (D4).
 * Both are matched against `orderId` before firing their callback, since the
 * underlying socket is shared per session, not per order.
 */
export function useOrderPaymentNotifications(
  orderId: string | undefined,
  onConfirmed: () => void,
  onRefunded?: () => void,
) {
  useEffect(() => {
    const unsubscribeSuccess = orderRealtimeService.subscribeToPaymentSuccess((event) => {
      if (event.orderId !== orderId) return;

      toast.success('Payment confirmed', {
        description: 'Your order is now in the queue.',
      });
      onConfirmed();
    });

    const unsubscribeRefunded = orderRealtimeService.subscribeToPaymentRefunded((event) => {
      if (event.orderId !== orderId) return;

      toast.success('Refund confirmed', {
        description: 'Your payment has been refunded.',
      });
      onRefunded?.();
    });

    return () => {
      unsubscribeSuccess();
      unsubscribeRefunded();
    };
  }, [orderId, onConfirmed, onRefunded]);

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
