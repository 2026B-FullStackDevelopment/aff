// Loads active food listings for the public browse page. Real GET
// /listings call (api_design.md §6) — replaces the earlier
// mockFetchListings stand-in now that D1's backend has shipped.
//
// Scope: D1 only — unfiltered browse + pagination. Search/city/category/
// price/sort state lives in useFoodFilter.ts and FoodFilterPanel.tsx,
// which are deliberately left unmounted until D6 rewires them against
// this hook.
import { useEffect, useState } from 'react';
import { listingService } from '../services/listing.service';
import type { ListingDTO } from '@/types/api';

const DEFAULT_LIMIT = 6;

export function useFoodListings() {
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [listings, setListings] = useState<ListingDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listingService.getAvailableListings({ page, limit });

        if (!isMounted) return;

        if (!response.ok || !response.data) {
          setError('Could not load listings. Please try again.');
          return;
        }

        setListings(response.data.items);
        setTotal(response.data.total);
      } catch {
        // Only reached on a network-level failure (fetch() itself rejecting)
        // — mirrors useListingDetail.ts's error-handling shape.
        if (isMounted) {
          setError('Could not load listings. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      isMounted = false;
    };
  }, [page, limit]);

  return { listings, total, page, limit, isLoading, error, setPage };
}
