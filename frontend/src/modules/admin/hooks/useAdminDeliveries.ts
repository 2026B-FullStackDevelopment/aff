import { useCallback, useEffect, useRef, useState } from 'react';
import { getResponseMessage } from '@/shared/utils/apiError';
import type { AdminDeliveryDTO, DeliveryStage } from '@/types/api';
import { adminOversightService } from '../services/adminOversight.service';

const PAGE_SIZE = 20;

/** Owns read-only Admin Delivery queries, stage filtering, and paging. */
export function useAdminDeliveries() {
  const [items, setItems] = useState<AdminDeliveryDTO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState<DeliveryStage | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (nextPage: number, nextStage: DeliveryStage | '') => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminOversightService.listDeliveries({
        page: nextPage,
        limit: PAGE_SIZE,
        stage: nextStage || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      if (!response.ok || !response.data) {
        setError(getResponseMessage(response.data, 'Unable to load deliveries.'));
        setIsLoading(false);
        return;
      }

      setItems(response.data.items);
      setPage(response.data.page);
      setTotal(response.data.total);
      setIsLoading(false);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError('Unable to reach the server. Check your connection and try again.');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1, '');
    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  const changeStage = useCallback(
    (nextStage: DeliveryStage | '') => {
      setStage(nextStage);
      void load(1, nextStage);
    },
    [load],
  );

  return {
    items,
    page,
    total,
    pageSize: PAGE_SIZE,
    stage,
    isLoading,
    error,
    changeStage,
    goToPage: (nextPage: number) => load(nextPage, stage),
    retry: () => load(page, stage),
  };
}

export default useAdminDeliveries;
