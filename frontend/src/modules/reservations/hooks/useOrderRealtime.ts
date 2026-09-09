import { useEffect } from 'react';
import { toast } from '@/shared/components/ui/sonner';
import { getStoredToken, getStoredUser } from '@/services/authStorage';
import { orderRealtimeService } from '../services/orderRealtime.service';
import type {
  OrderStageChangedEvent,
  DeliveryLocationEvent,
  DeliveryDeliveredEvent,
} from '../services/orderRealtime.service';

interface UseOrderRealtimeCallbacks {
  onPaymentSuccess: () => void;
  onPaymentRefunded?: () => void;
  onStageChanged: (event: OrderStageChangedEvent) => void;
  onLocationUpdate: (event: DeliveryLocationEvent) => void;
  onDelivered: (event: DeliveryDeliveredEvent) => void;
}

/**
 * Connects an authenticated Recipient to every Recipient-scoped Socket.IO
 * event this order-tracking page needs, and joins/leaves the order-scoped
 * room the live-position/delivered events require:
 *  - `payment:success`/`payment:refunded`: personal room, existing (D2/D4).
 *  - `order:status_changed` (E8), `delivery:location` (E9), `delivery:delivered`
 *    (E10): the latter two need `order:<orderId>`, joined here as soon as
 *    `orderId` is known — Socket.IO buffers emits issued before the
 *    connection completes, so no explicit "connected" wait is needed.
 * All five events are matched against `orderId` before firing their callback,
 * since the underlying socket is shared per session, not per order.
 */
export function useOrderRealtime(
  orderId: string | undefined,
  callbacks: UseOrderRealtimeCallbacks,
) {
  useEffect(() => {
    const unsubscribeSuccess = orderRealtimeService.subscribeToPaymentSuccess((event) => {
      if (event.orderId !== orderId) return;

      toast.success('Payment confirmed', {
        description: 'Your order is now in the queue.',
      });
      callbacks.onPaymentSuccess();
    });

    const unsubscribeRefunded = orderRealtimeService.subscribeToPaymentRefunded((event) => {
      if (event.orderId !== orderId) return;

      toast.success('Refund confirmed', {
        description: 'Your payment has been refunded.',
      });
      callbacks.onPaymentRefunded?.();
    });

    const unsubscribeStageChanged = orderRealtimeService.subscribeToStageChanged((event) => {
      if (event.orderId !== orderId) return;
      callbacks.onStageChanged(event);
    });

    const unsubscribeLocation = orderRealtimeService.subscribeToLocationUpdate((event) => {
      if (event.orderId !== orderId) return;
      callbacks.onLocationUpdate(event);
    });

    const unsubscribeDelivered = orderRealtimeService.subscribeToDelivered((event) => {
      if (event.orderId !== orderId) return;
      callbacks.onDelivered(event);
    });

    return () => {
      unsubscribeSuccess();
      unsubscribeRefunded();
      unsubscribeStageChanged();
      unsubscribeLocation();
      unsubscribeDelivered();
    };
  }, [
    orderId,
    callbacks.onPaymentSuccess,
    callbacks.onPaymentRefunded,
    callbacks.onStageChanged,
    callbacks.onLocationUpdate,
    callbacks.onDelivered,
  ]);

  useEffect(() => {
    const user = getStoredUser();
    const token = getStoredToken();
    const isAuthenticatedRecipient = user?.role === 'RECIPIENT' && Boolean(token);

    if (!isAuthenticatedRecipient || !token || !orderId) {
      orderRealtimeService.disconnect();
      return;
    }

    orderRealtimeService.connect(token);
    orderRealtimeService.joinOrder(orderId);

    return () => {
      orderRealtimeService.leaveOrder(orderId);
      orderRealtimeService.disconnect();
    };
  }, [orderId]);
}
