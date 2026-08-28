// Loads active food listings for the public browse page, driven entirely
// by the ListingFilters object owned by FoodListingsPage. Debounces the
// actual request by 400ms (matching useNominatimSearch's convention) so
// typing in the search box doesn't fire one request per keystroke; other
// filter changes (city/category/price/sort/page) pay the same short delay
// rather than splitting search and non-search filters into two debounce
// paths — acceptable for D6's scope.
import { useEffect, useState } from 'react';
import { listingService } from '../services/listing.service';
import type { ListingDTO } from '@/types/api';
import type { ListingFilters } from './useFoodFilter';

const DEBOUNCE_MS = 400;

interface UseFoodListingsResult {
  listings: ListingDTO[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function useFoodListings(filters: ListingFilters): UseFoodListingsResult {
  const [listings, setListings] = useState<ListingDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const handle = window.setTimeout(async () => {
      try {
        const response = await listingService.getAvailableListings(filters);

        if (!isMounted) return;

        if (!response.ok || !response.data) {
          setError('Could not load listings. Please try again.');
          return;
        }

        setListings(response.data.items);
        setTotal(response.data.total);
      } catch {
        // Only reached on a network-level failure (fetch() itself rejecting).
        if (isMounted) {
          setError('Could not load listings. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(handle);
    };
  }, [filters]);

  return { listings, total, isLoading, error };
}
