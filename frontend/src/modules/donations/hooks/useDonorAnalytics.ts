import { useEffect, useState } from 'react';
import { getResponseMessage } from '@/shared/utils/apiError';
import { listingService } from '../services/listing.service';
import type { DonorAnalyticsSnapshot } from '../types';

const EMPTY_ANALYTICS: DonorAnalyticsSnapshot = {
  totalRevenue: 0,
  totalListings: 0,
  currentListings: 0,
  soldOutListings: 0,
  categories: [],
  topListings: [],
};

// Loads the authenticated Donor's server-aggregated analytics snapshot.
export function useDonorAnalytics() {
  const [snapshot, setSnapshot] =
    useState<DonorAnalyticsSnapshot>(EMPTY_ANALYTICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listingService.getAnalytics();

        if (!response.ok || !response.data) {
          throw new Error(
            getResponseMessage(response.data, 'Unable to load analytics data.'),
          );
        }

        if (isCurrentRequest) {
          setSnapshot(response.data);
        }
      } catch (loadError) {
        if (!isCurrentRequest) return;

        setSnapshot(EMPTY_ANALYTICS);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load analytics data.',
        );
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      isCurrentRequest = false;
    };
  }, [refreshTrigger]);

  function refresh() {
    setRefreshTrigger((current) => current + 1);
  }

  return { snapshot, isLoading, error, refresh };
}
