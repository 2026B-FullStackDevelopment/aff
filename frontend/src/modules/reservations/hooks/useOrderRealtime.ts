import { useEffect } from 'react';
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
 * Joins/leaves the order-scoped room this order-tracking page needs, and
 * forwards `order:status_changed` (E8), `delivery:location` (E9), and
 * `delivery:delivered` (E10) into the given callbacks, filtered by `orderId`
 * since the underlying socket is shared per session, not per order.
 *
 * `payment:success`/`payment:refunded` still forward into their own data
 * callbacks here (reload/refund-state patching) — the toast for those two
 * events now comes from useLiveNotificationToasts (mounted once, at the app
 * root), not from this hook.
 */
export function useOrderRealtime(
  orderId: string | undefined,
  callbacks: UseOrderRealtimeCallbacks,
) {
  useEffect(() => {
    const unsubscribeSuccess = orderRealtimeService.subscribeToPaymentSuccess((event) => {
      if (event.orderId !== orderId) return;
      callbacks.onPaymentSuccess();
    });

    const unsubscribeRefunded = orderRealtimeService.subscribeToPaymentRefunded((event) => {
      if (event.orderId !== orderId) return;
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
    if (!orderId) return;

    orderRealtimeService.joinOrder(orderId);

    return () => {
      orderRealtimeService.leaveOrder(orderId);
    };
  }, [orderId]);
}
