import { useCallback, useEffect, useRef, useState } from 'react';
import { getResponseMessage } from '@/shared/utils/apiError';
import { courierRealtimeService } from '../services/courierRealtime.service';
import { deliveryService } from '../services/delivery.service';
import type { DeliveryDTO } from '@/types/api';

export function useActiveDelivery() {
  const [delivery, setDelivery] = useState<DeliveryDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGone, setIsGone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocationDenied, setIsLocationDenied] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Tracks whether the hook is still mounted, so async continuations
  // never call a setter after unmount.
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const response = await deliveryService.getActive();

    if (!isMountedRef.current) return;

    if (response.status === 200 && response.data) {
      setDelivery(response.data);

      // Resume broadcasting after a reload mid-delivery.
      if (response.data.stage === 'PICKED_UP') {
        courierRealtimeService.startTracking(() => setIsLocationDenied(true));
      }
    } else {
      setIsGone(true);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  const pickup = useCallback(async () => {
    if (!delivery) return;

    setIsSubmitting(true);
    setActionError(null);

    const response = await deliveryService.pickup(delivery.id);

    if (!isMountedRef.current) return;

    setIsSubmitting(false);

    if (response.status === 200 && response.data) {
      setDelivery(response.data);
      // Only after the stage actually advanced — a 409 means it did not (E6).
      courierRealtimeService.startTracking(() => setIsLocationDenied(true));
      return;
    }

    setActionError(getResponseMessage(response.data, 'Unable to confirm pickup.'));
    await load();
  }, [delivery, load]);

  const deliver = useCallback(
    async (cashConfirmed?: boolean) => {
      if (!delivery) return;

      setIsSubmitting(true);
      setActionError(null);

      const response = await deliveryService.deliver(delivery.id, cashConfirmed);
      const isDelivered = response.status === 200 && Boolean(response.data);

      // Must run even if this component has unmounted: a leaked geolocation watch
      // and timer outlive the page and drain the Courier's phone.
      if (isDelivered) {
        courierRealtimeService.stopTracking();
      }

      if (!isMountedRef.current) return;

      setIsSubmitting(false);

      if (isDelivered) {
        setIsComplete(true);
        return;
      }

      setActionError(getResponseMessage(response.data, 'Unable to complete this delivery.'));
      await load();
    },
    [delivery, load],
  );

  return {
    delivery,
    isLoading,
    isGone,
    isComplete,
    isSubmitting,
    actionError,
    isLocationDenied,
    pickup,
    deliver,
  };
}
