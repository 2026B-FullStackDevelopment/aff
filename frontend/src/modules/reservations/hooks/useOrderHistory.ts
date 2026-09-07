import { useCallback, useEffect, useState } from 'react';
import { getResponseMessage } from '@/shared/utils/apiError';
import { reservationService } from '../services/reservation.service';
import type { RecipientOrderDTO } from '@/types/api';

const ORDER_HISTORY_PAGE_SIZE = 20;

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
