import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchCollectionHistory,
  submitFeedback,
  COLLECTION_HISTORY_PAGE_SIZE,
  type CollectionHistoryItem,
} from '../services/collectionHistory.mock';

// Mirrors the shape services/hooks like useFoodListings already return, so
// swapping fetchCollectionHistory for a real `GET /orders/mine` call later
// only touches this file — CollectionHistoryTable and the page never see it.
export function useCollectionHistory() {
  const [items, setItems] = useState<CollectionHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchCollectionHistory(targetPage, COLLECTION_HISTORY_PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
    } catch {
      setError('We couldn\u2019t load your collection history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const submitItemFeedback = useCallback(
    async (orderId: string, comment: string) => {
      setPendingFeedbackId(orderId);

      try {
        await submitFeedback(orderId, comment);
        setItems((current) =>
          current.map((item) =>
            item.id === orderId ? { ...item, feedbackSubmitted: true } : item,
          ),
        );
        toast.success('Feedback submitted');
        return true;
      } catch {
        toast.error('Feedback couldn\u2019t be submitted. Please try again.');
        return false;
      } finally {
        setPendingFeedbackId(null);
      }
    },
    [],
  );

  return {
    items,
    page,
    setPage,
    pageSize: COLLECTION_HISTORY_PAGE_SIZE,
    total,
    isLoading,
    error,
    refetch: () => load(page),
    pendingFeedbackId,
    submitItemFeedback,
  };
}

export default useCollectionHistory;
