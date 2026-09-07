import { useCallback, useEffect, useRef, useState } from 'react';
import { listingService } from '../services/listing.service';
import type { ListingDetailDTO } from '@/types/api';

interface UseListingDetailResult {
  data: ListingDetailDTO | null;
  isLoading: boolean;
  isRefetching: boolean;
  isNotFound: boolean;
  error: string | null;
  reload: () => void;
}

export function useListingDetail(listingId: string | undefined): UseListingDetailResult {
  const [data, setData] = useState<ListingDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (!listingId) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    let isMounted = true;

    if (hasLoadedOnceRef.current) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setIsNotFound(false);
    setError(null);

    async function load() {
      try {
        const response = await listingService.getListingById(listingId as string);
        if (!isMounted) return;

        if (response.status === 404) {
          setIsNotFound(true);
        } else if (!response.ok || !response.data) {
          setError('Could not load this listing. Please try again.');
        } else {
          setData(response.data);
          hasLoadedOnceRef.current = true;
        }
      } catch {
        if (isMounted) {
          setError('Could not load this listing. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefetching(false);
        }
      }
    }

    load();
    return () => { isMounted = false; };
  }, [listingId, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, isLoading, isRefetching, isNotFound, error, reload };
}
