import { useCallback, useEffect, useRef, useState } from 'react';
import { reservationService } from '../services/reservation.service';
import type {
  OrderStageChangedEvent,
  DeliveryLocationEvent,
  DeliveryDeliveredEvent,
} from '../services/orderRealtime.service';
import type { DeliveryStage, GeoLocation } from '@/types/api';

interface InitialDelivery {
  id: string | null;
  stage: DeliveryStage;
}

// AWAITING_COURIER and ASSIGNED share a rank — E8 maps both to the same
// "preparing" step, so there is no meaningful backward move between them to
// guard against. CANCELLED never arrives via these events (order:status_changed
// only fires on claim/pickup/deliver), so it needs no rank at all.
const STAGE_RANK: Partial<Record<DeliveryStage, number>> = {
  AWAITING_COURIER: 0,
  ASSIGNED: 0,
  PICKED_UP: 1,
  DELIVERED: 2,
};

function rankOf(stage: DeliveryStage | null): number {
  if (stage === null) return -1;
  return STAGE_RANK[stage] ?? -1;
}

/**
 * Owns the live-tracking state for one order: the current Delivery stage,
 * the Courier's last known position, and the delivered timestamp.
 *
 * Stage updates are monotonic (spec D4): an incoming stage is only accepted
 * if it would not move the tracked stage backward. This is what makes the
 * dual-room `delivery:delivered` emission harmless (the second copy is a
 * same-or-lower-rank no-op) and what protects against a network-reordered
 * event. `courierPosition` and `deliveredAt` need no equivalent guard — once
 * `stage` is `DELIVERED`, the consuming UI stops rendering the map and the
 * confirmation shows regardless of how many times the same value is set.
 *
 * `GET /deliveries/:id` is called at most once, only when the initial stage
 * is `PICKED_UP` or `DELIVERED` — the two states where its data
 * (`courierLastLocation`, `deliveredAt`) is actually needed (spec D2). A live
 * transition into either state while this hook is already mounted never
 * triggers this call: the Recipient is already joined to the order's room by
 * then, so the next `delivery:location` ping or the `delivery:delivered`
 * payload (which carries `deliveredAt` itself) arrives on its own.
 */
export function useDeliveryTracking(
  orderId: string | undefined,
  initialDelivery: InitialDelivery | null,
) {
  const [stage, setStage] = useState<DeliveryStage | null>(initialDelivery?.stage ?? null);
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
  const [courierPosition, setCourierPosition] = useState<GeoLocation | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Depend on the primitive id/stage, not the `initialDelivery` object
  // reference — `order` (and so `order.delivery`) gets a new object identity
  // on every unrelated mutation (e.g. after a cancel), which would otherwise
  // re-trigger this hydration call for no reason.
  const initialDeliveryId = initialDelivery?.id;
  const initialStage = initialDelivery?.stage;

  // C1 — `initialDelivery` is `null` on the very first render (the parent's
  // `order` fetch is still in flight), so the `useState` initializer above
  // only ever sees `null`. Once `order` resolves and `initialStage` becomes
  // known, sync it up here — through the same monotonic rank guard used by
  // `handleStageChanged`/`handleDelivered` — so a cold load landing directly
  // in PICKED_UP or DELIVERED still renders the correct stage instead of
  // being stuck at `null` (which happens to render like PREPARING) forever.
  useEffect(() => {
    const nextStage = initialStage ?? null;
    setStage((prev) => (rankOf(nextStage) > rankOf(prev) ? (nextStage as DeliveryStage) : prev));
  }, [initialStage]);

  useEffect(() => {
    if (!initialDeliveryId) return;
    if (initialStage !== 'PICKED_UP' && initialStage !== 'DELIVERED') return;

    async function hydrate() {
      try {
        const response = await reservationService.getDeliveryById(initialDeliveryId as string);
        if (!isMountedRef.current) return;
        if (!response.ok || !response.data) return;

        if (response.data.courierLastLocation) {
          setCourierPosition(response.data.courierLastLocation);
        }
        if (response.data.deliveredAt) {
          setDeliveredAt(response.data.deliveredAt);
        }
      } catch (error) {
        // I4 — `httpClient`'s underlying `fetch` rejects on network failure
        // (not just non-2xx). Degrade silently: a live `delivery:location`/
        // `delivery:delivered` event can still arrive later over the socket.
        console.warn('Failed to hydrate delivery tracking state', error);
      }
    }

    void hydrate();
  }, [initialDeliveryId, initialStage]);

  const handleStageChanged = useCallback(
    (event: OrderStageChangedEvent) => {
      if (event.orderId !== orderId) return;
      setStage((prev) => (rankOf(event.stage) >= rankOf(prev) ? event.stage : prev));
    },
    [orderId],
  );

  const handleLocationUpdate = useCallback(
    (event: DeliveryLocationEvent) => {
      if (event.orderId !== orderId) return;
      setCourierPosition({
        latitude: event.latitude,
        longitude: event.longitude,
        updatedAt: event.updatedAt,
      });
    },
    [orderId],
  );

  const handleDelivered = useCallback(
    (event: DeliveryDeliveredEvent) => {
      if (event.orderId !== orderId) return;
      setStage((prev) => (rankOf('DELIVERED') >= rankOf(prev) ? 'DELIVERED' : prev));
      setDeliveredAt(event.deliveredAt);
    },
    [orderId],
  );

  return {
    stage,
    deliveredAt,
    courierPosition,
    handleStageChanged,
    handleLocationUpdate,
    handleDelivered,
  };
}
