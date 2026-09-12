import { useCallback, useEffect, useState } from 'react';
import { getResponseMessage } from '@/shared/utils/apiError';
import { notificationService } from '../services/notification.service';
import type { NotificationDTO } from '@/types/api';

const NOTIFICATIONS_PAGE_SIZE = 5;

let inFlightFirstPage: ReturnType<typeof notificationService.getMyNotifications> | null = null;

function fetchPage(targetPage: number) {
  if (targetPage !== 1) {
    return notificationService.getMyNotifications(targetPage, NOTIFICATIONS_PAGE_SIZE);
  }

  if (!inFlightFirstPage) {
    inFlightFirstPage = notificationService
      .getMyNotifications(1, NOTIFICATIONS_PAGE_SIZE)
      .finally(() => {
        inFlightFirstPage = null;
      });
  }

  return inFlightFirstPage;
}

/**
 * Loads the authenticated user's own notification history from
 * `GET /notifications` (H2) for the bell dropdown. Fetches page 1 whenever
 * `enabled` turns true (the panel opens) and appends subsequent pages via
 * `loadMore` rather than replacing, since this is a dropdown list rather
 * than a paged table.
 */
export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchPage(targetPage);

      if (!response.ok || !response.data) {
        setError(getResponseMessage(response.data, "We couldn't load your notifications. Please try again."));
        return;
      }

      const page = response.data;
      setItems((current) => (targetPage === 1 ? page.items : [...current, ...page.items]));
      setTotal(page.total);
      setPage(targetPage);
    } catch {
      setError("We couldn't load your notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load(1);
  }, [enabled, load]);

  return {
    items,
    total,
    hasMore: items.length < total,
    isLoading,
    error,
    loadMore: () => load(page + 1),
  };
}

export default useNotifications;
