import { useCallback, useEffect, useState } from 'react';
import { getResponseMessage } from '@/shared/utils/apiError';
import { reservationService } from '../services/reservation.service';
import { orderRealtimeService } from '../services/orderRealtime.service';
import type { RecipientOrderDTO } from '@/types/api';

const ORDER_HISTORY_PAGE_SIZE = 5;

/**
 * Loads the authenticated Recipient's own Order history from `GET /orders/mine`
 * (D5) — paginated and already enriched with donor/listing/delivery data
 * server-side, so this hook never needs a second request per row.
 *
 * Feedback submission is deliberately NOT part of this hook. Per D7's AC1,
 * the feedback form lives on the order detail page — see
 * `useOrderTracking.ts#submitFeedback` — not the history list. This
 * replaces `useCollectionHistory.ts`, which called the retired
 * `collectionHistory.mock.ts`.
 */
export function useOrderHistory() {
  const [items, setItems] = useState<RecipientOrderDTO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await reservationService.getMyOrders(
        targetPage,
        ORDER_HISTORY_PAGE_SIZE,
      );

      if (!response.ok || !response.data) {
        setError(
          getResponseMessage(
            response.data,
            "We couldn't load your order history. Please try again.",
          ),
        );
        return;
      }

      setItems(response.data.items);
      setTotal(response.data.total);
    } catch {
      setError("We couldn't load your order history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  // Unlike the order detail page (useOrderTracking/useOrderRealtime), this list has no
  // single orderId to scope a room join to, but payment:success/payment:refunded are
  // emitted to this Recipient's own user room regardless (no join needed) — so refetch
  // the currently-viewed page on either, otherwise a row's paymentStatus stays stale
  // until a manual reload.
  useEffect(() => {
    const unsubscribeSuccess = orderRealtimeService.subscribeToPaymentSuccess(() => {
      void load(page);
    });
    const unsubscribeRefunded = orderRealtimeService.subscribeToPaymentRefunded(() => {
      void load(page);
    });

    return () => {
      unsubscribeSuccess();
      unsubscribeRefunded();
    };
  }, [load, page]);

  return {
    items,
    page,
    setPage,
    pageSize: ORDER_HISTORY_PAGE_SIZE,
    total,
    isLoading,
    error,
    refetch: () => load(page),
  };
}

export default useOrderHistory;
