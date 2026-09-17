import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/shared/components/ui/sonner';
import { getResponseMessage } from '@/shared/utils/apiError';
import type { AdminListingDTO } from '@/types/api';
import { adminOversightService } from '../services/adminOversight.service';

const PAGE_SIZE = 10;

/** Owns Admin listing-directory queries, paging, search, and cancellation. */
export function useAdminListings() {
  const [items, setItems] = useState<AdminListingDTO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (nextPage: number, nextSearch: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminOversightService.listListings({
        page: nextPage,
        limit: PAGE_SIZE,
        search: nextSearch || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      if (!response.ok || !response.data) {
        setError(getResponseMessage(response.data, 'Unable to load listings.'));
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

  const applySearch = useCallback(
    (value: string) => {
      const normalized = value.trim();
      setSearch(normalized);
      void load(1, normalized);
    },
    [load],
  );

  const cancelListing = useCallback(
    async (listing: AdminListingDTO): Promise<boolean> => {
      setCancellingId(listing.id);
      let response: Awaited<
        ReturnType<typeof adminOversightService.cancelListing>
      >;

      try {
        response = await adminOversightService.cancelListing(listing.id);
      } catch {
        setCancellingId(null);
        toast.error('Unable to cancel listing', {
          description: 'Unable to reach the server. Check your connection and try again.',
        });
        return false;
      }

      setCancellingId(null);

      if (!response.ok || !response.data) {
        toast.error('Unable to cancel listing', {
          description: getResponseMessage(
            response.data,
            'The listing may have changed. Refresh and try again.',
          ),
        });
        return false;
      }

      toast.success('Listing cancelled', {
        description: `${response.data.cancelledOrderCount} pending ${response.data.cancelledOrderCount === 1 ? 'order was' : 'orders were'} cancelled.`,
      });
      await load(page, search);
      return true;
    },
    [load, page, search],
  );

  return {
    items,
    page,
    total,
    pageSize: PAGE_SIZE,
    search,
    isLoading,
    error,
    cancellingId,
    applySearch,
    cancelListing,
    goToPage: (nextPage: number) => load(nextPage, search),
    retry: () => load(page, search),
  };
}

export default useAdminListings;
