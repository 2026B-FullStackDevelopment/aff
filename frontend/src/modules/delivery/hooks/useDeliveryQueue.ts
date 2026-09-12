import { useCallback, useEffect, useRef, useState } from 'react';
import { getResponseMessage } from '@/shared/utils/apiError';
import { deliveryService } from '../services/delivery.service';
import type { QueueDeliveryDTO } from '@/types/api';

const PAGE_SIZE = 20;

export function useDeliveryQueue() {
  const [items, setItems] = useState<QueueDeliveryDTO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Null until the check resolves; true means redirect to /deliveries/active.
  const [hasActiveDelivery, setHasActiveDelivery] = useState<boolean | null>(null);

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);

  // Tracks whether the hook is still mounted, so async continuations (the
  // mount-effect's getActive/loadQueue chain, and claim's response handler)
  // never call a setter after unmount.
  const isMountedRef = useRef(true);

  // Tracks the delivery id of the claim the user is currently waiting on.
  // DeliveryCard only disables the button for its own row, so a second row can be
  // clicked while an earlier claim is still in flight (supported by design).
  // A response is only allowed to touch state if it belongs to whichever
  // claim is current when the response arrives — an older, superseded
  // response is ignored entirely rather than clobbering the newer one.
  const activeClaimIdRef = useRef<string | null>(null);

  const loadQueue = useCallback(async (nextPage: number) => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    setError(null);

    const response = await deliveryService.getQueue(nextPage, PAGE_SIZE);

    if (!isMountedRef.current) return;

    if (!response.data) {
      setError(getResponseMessage(response.data, 'Unable to load the delivery queue.'));
      setIsLoading(false);
      return;
    }

    setItems(response.data.items);
    setTotal(response.data.total);
    setPage(response.data.page);
    setIsLoading(false);
  }, []);

  // E4: a Courier with a job in progress never sees the queue. This is why the
  // check is a request rather than a scan of the queue — an active Delivery is
  // by definition not in the queue.
  useEffect(() => {
    isMountedRef.current = true;

    async function checkActive() {
      const response = await deliveryService.getActive();
      if (!isMountedRef.current) return;

      if (response.status === 200 && response.data) {
        setHasActiveDelivery(true);
        return;
      }

      setHasActiveDelivery(false);
      // loadQueue guards its own setters against unmount, so the chained
      // await here is safe even if the hook unmounts while it's pending.
      await loadQueue(1);
    }

    checkActive();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadQueue]);

  const claim = useCallback(
    async (deliveryId: string) => {
      activeClaimIdRef.current = deliveryId;
      setClaimingId(deliveryId);
      setRowError(null);

      const response = await deliveryService.claim(deliveryId);

      // Ignore this response entirely if a newer claim has since become the
      // one the user is waiting on, or if the hook has unmounted (e.g. an
      // earlier claim already succeeded and navigated away).
      if (!isMountedRef.current || activeClaimIdRef.current !== deliveryId) {
        return;
      }

      setClaimingId(null);

      if (response.status === 200 && response.data) {
        setClaimedId(deliveryId);
        return;
      }

      // E3: a 409 is the normal condition of a shared queue, not an error
      // state. Show the server's own message — it distinguishes "already
      // claimed" from "you already have an active delivery" — then refresh so
      // the stale row disappears.
      setRowError({
        id: deliveryId,
        message: getResponseMessage(response.data, 'Unable to claim this delivery.'),
      });
      await loadQueue(page);
    },
    [loadQueue, page],
  );

  return {
    items,
    page,
    total,
    pageSize: PAGE_SIZE,
    isLoading,
    error,
    hasActiveDelivery,
    claimingId,
    rowError,
    claimedId,
    claim,
    goToPage: loadQueue,
    retry: () => loadQueue(page),
  };
}
