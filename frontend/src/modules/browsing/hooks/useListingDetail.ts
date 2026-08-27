// Fetch-on-mount for a single listing by :id. Mirrors the error-handling
// shape already established in useFoodListings.ts, but adds a distinct
// `isNotFound` branch for the backend's 404 (listing.service.ts throws
// createHttpError(404, 'Listing not found.')).
//
// NOTE: httpClient.request() never throws on a non-2xx HTTP response —
// it always resolves with { data, status, ok }. Only a genuine network
// failure (fetch() rejecting) lands in the catch block below.
import { useCallback, useEffect, useState } from 'react';
import { listingService } from '../services/listing.service';
import type { ListingDetailDTO } from '@/types/api';

interface UseListingDetailResult {
  data: ListingDetailDTO | null;
  isLoading: boolean;
  isNotFound: boolean;
  error: string | null;
  reload: () => void;
}

export function useListingDetail(listingId: string | undefined): UseListingDetailResult {
  const [data, setData] = useState<ListingDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!listingId) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
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
        }
      } catch {
        // Only reached on a network-level failure (fetch() itself rejecting).
        if (isMounted) {
          setError('Could not load this listing. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [listingId, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, isLoading, isNotFound, error, reload };
}
