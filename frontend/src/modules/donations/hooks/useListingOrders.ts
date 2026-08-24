import {
  useEffect,
  useState,
} from 'react';
import type { ListingDTO } from '@/types/api';
import { listingService } from '../services/listing.service';
import type { ListingOrderDTO } from '../types';

const PAGE_SIZE = 10;

interface ListingOrderPaginationState {
  listingId: string | null;
  page: number;
}

function getResponseMessage(
  data: unknown,
  fallback: string,
): string {
  if (
    typeof data === 'object'
    && data !== null
    && 'message' in data
    && typeof data.message === 'string'
  ) {
    return data.message;
  }

  return fallback;
}

// Loads the selected listing and its paginated tracked orders for C8.
export function useListingOrders(
  listingId: string | null,
) {
  const [listing, setListing] =
    useState<ListingDTO | null>(null);

  const [orders, setOrders] =
    useState<ListingOrderDTO[]>([]);

  const [total, setTotal] =
    useState(0);

  const [pagination, setPagination] =
    useState<ListingOrderPaginationState>({
      listingId,
      page: 1,
    });

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [isEndpointUnavailable, setIsEndpointUnavailable] =
    useState(false);

  const [isForbidden, setIsForbidden] =
    useState(false);

  const [loadVersion, setLoadVersion] =
    useState(0);

  const page =
    pagination.listingId === listingId
      ? pagination.page
      : 1;

  useEffect(() => {
    let ignoreResult = false;

    async function loadListingOrders() {
      setError(null);
      setIsEndpointUnavailable(false);
      setIsForbidden(false);

      if (!listingId) {
        setListing(null);
        setOrders([]);
        setTotal(0);
        setIsLoading(false);
        setError(
          'Choose a listing from Donation Management to view its reservations.',
        );
        return;
      }

      setIsLoading(true);
      setListing(null);
      setOrders([]);
      setTotal(0);

      try {
        const listingResponse =
          await listingService.getListing(
            listingId,
          );

        if (ignoreResult) {
          return;
        }

        if (listingResponse.status === 404) {
          setError(
            'This listing could not be found.',
          );
          return;
        }

        if (
          !listingResponse.ok
          || !listingResponse.data
        ) {
          setError(
            getResponseMessage(
              listingResponse.data,
              'Unable to load the selected listing.',
            ),
          );
          return;
        }

        const selectedListing =
          listingResponse.data;

        setListing(selectedListing);

        if (
          selectedListing.unit
          === 'PER_REQUEST'
        ) {
          setOrders([]);
          setTotal(0);
          return;
        }

        const ordersResponse =
          await listingService.getListingOrders(
            listingId,
            page,
            PAGE_SIZE,
          );

        if (ignoreResult) {
          return;
        }

        if (ordersResponse.status === 501) {
          setIsEndpointUnavailable(true);
          setError(
            'Listing order management is not implemented by the backend yet.',
          );
          return;
        }

        if (ordersResponse.status === 403) {
          setIsForbidden(true);
          setError(
            'You do not have permission to view orders for this listing.',
          );
          return;
        }

        if (ordersResponse.status === 404) {
          setError(
            'This listing no longer exists.',
          );
          return;
        }

        if (
          !ordersResponse.ok
          || !ordersResponse.data
        ) {
          setError(
            getResponseMessage(
              ordersResponse.data,
              'Unable to load reservations for this listing.',
            ),
          );
          return;
        }

        setOrders(
          ordersResponse.data.items,
        );

        setTotal(
          ordersResponse.data.total,
        );
      } catch {
        if (!ignoreResult) {
          setError(
            'Unable to reach AFF. Check your connection and try again.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    loadListingOrders();

    return () => {
      ignoreResult = true;
    };
  }, [
    listingId,
    page,
    loadVersion,
  ]);

  function setPage(
    nextPage: number,
  ) {
    if (!listingId) {
      return;
    }

    setPagination({
      listingId,
      page: Math.max(
        1,
        Math.floor(nextPage),
      ),
    });
  }

  function retry() {
    setLoadVersion(
      (current) => current + 1,
    );
  }

  return {
    listing,
    orders,
    page,
    pageSize: PAGE_SIZE,
    total,
    isLoading,
    error,
    isEndpointUnavailable,
    isForbidden,
    isPerRequest:
      listing?.unit === 'PER_REQUEST',
    setPage,
    retry,
  };
}

export default useListingOrders;