import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FoodCategory } from '@/types/api';
import { listingService } from '../services/listing.service';
import { getResponseMessage } from '@/shared/utils/apiError';
import type {
  ListingGroup,
  ListingSortField,
  ManagedListingDTO,
  MyListingsQuery,
  SortDirection,
} from '../types';
import { donorRealtimeService } from '../services/donorRealtime.service';

const FOOD_CATEGORIES: FoodCategory[] = [
  'FRUIT',
  'VEGETABLE',
  'MEAT',
  'COOKED_DISH',
  'BAKED_GOODS',
  'DRINK',
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 350;

function parsePositiveInteger(
  value: string | null,
  fallback: number,
): number {
  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue)
    || parsedValue < 1
  ) {
    return fallback;
  }

  return parsedValue;
}

function parseListingGroup(
  value: string | null,
): ListingGroup {
  return value === 'PAST'
    ? 'PAST'
    : 'ACTIVE';
}

function parseCategory(
  value: string | null,
): FoodCategory | undefined {
  return FOOD_CATEGORIES.includes(
    value as FoodCategory,
  )
    ? value as FoodCategory
    : undefined;
}

function parseSortField(
  value: string | null,
): ListingSortField {
  return value === 'revenue'
    ? 'revenue'
    : 'createdAt';
}

function parseSortDirection(
  value: string | null,
): SortDirection {
  return value === 'asc'
    ? 'asc'
    : 'desc';
}


// Owns URL filters and server state for GET /listings/mine.
export function useDonorListings() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const [listings, setListings] =
    useState<ManagedListingDTO[]>([]);

  const [searchInput, setSearchInput] =
    useState(searchParams.get('search') ?? '');

  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [isEndpointUnavailable, setIsEndpointUnavailable] =
    useState(false);

  const [refreshTrigger, setRefreshTrigger] =
    useState(0);

  const group = parseListingGroup(
    searchParams.get('status'),
  );

  const category = parseCategory(
    searchParams.get('category'),
  );

  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const sort = parseSortField(
    searchParams.get('sort'),
  );

  const order = parseSortDirection(
    searchParams.get('order'),
  );

  const page = parsePositiveInteger(
    searchParams.get('page'),
    DEFAULT_PAGE,
  );

  const dateError =
    from && to && from > to
      ? 'Start date cannot be later than end date.'
      : null;

  const query = useMemo<MyListingsQuery>(
    () => ({
      status: group,
      search: searchParams.get('search') || undefined,
      category,
      from: from || undefined,
      to: to || undefined,
      sort,
      order,
      page,
      limit: DEFAULT_LIMIT,
    }),
    [
      group,
      category,
      from,
      to,
      sort,
      order,
      page,
      searchParams,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentSearch =
        searchParams.get('search') ?? '';

      if (currentSearch === searchInput.trim()) {
        return;
      }

      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        const normalizedSearch = searchInput.trim();

        if (normalizedSearch) {
          next.set('search', normalizedSearch);
        } else {
          next.delete('search');
        }

        next.set('page', '1');

        return next;
      }, {
        replace: true,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    searchInput,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (dateError) {
      setError(null);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadListings() {
      setIsLoading(true);
      setError(null);
      setIsEndpointUnavailable(false);

      try {
        const response =
          await listingService.getMyListings(query);

        if (!isMounted) {
          return;
        }

        if (response.status === 501) {
          setListings([]);
          setTotal(0);
          setIsEndpointUnavailable(true);
          setError(
            'Donor listing management is not available from the backend yet.',
          );
          return;
        }

        if (!response.ok || !response.data) {
          setListings([]);
          setTotal(0);
          setError(
            getResponseMessage(
              response.data,
              'Unable to load your listings. Please try again.',
            ),
          );
          return;
        }

        setListings(response.data.items);
        setTotal(response.data.total);
      } catch {
        if (!isMounted) {
          return;
        }

        setListings([]);
        setTotal(0);
        setError(
          'Unable to reach AFF. Check your connection and try again.',
        );
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
  }, [
    query,
    refreshTrigger,
    dateError,
  ]);

  function updateParameter(
    name: string,
    value: string,
  ) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (value) {
        next.set(name, value);
      } else {
        next.delete(name);
      }

      next.set('page', '1');

      return next;
    });
  }

 useEffect(() => {
  return donorRealtimeService
    .subscribeToSoldOut(
      (event) => {
        setListings((current) =>
          current
            .map(
              (
                listing,
              ): ManagedListingDTO => {
                if (
                  listing.id
                  !== event.listingId
                ) {
                  return listing;
                }

                return {
                  ...listing,
                  status: 'SOLD_OUT',
                  quantityRemaining: 0,
                };
              },
            )
            .filter((listing) =>
              group === 'ACTIVE'
                ? listing.id
                  !== event.listingId
                : true,
            ),
        );

        // Refresh totals and load the listing when Past Donations is open.
        setRefreshTrigger(
          (current) =>
            current + 1,
        );
      },
    );
}, [group]);

  function setGroup(nextGroup: ListingGroup) {
    updateParameter('status', nextGroup);
  }

  function setCategory(
    nextCategory: FoodCategory | '',
  ) {
    updateParameter('category', nextCategory);
  }

  function setFrom(nextFrom: string) {
    updateParameter('from', nextFrom);
  }

  function setTo(nextTo: string) {
    updateParameter('to', nextTo);
  }

  function setSort(nextSort: ListingSortField) {
    updateParameter('sort', nextSort);
  }

  function setOrder(nextOrder: SortDirection) {
    updateParameter('order', nextOrder);
  }

  function setPage(nextPage: number) {
    if (nextPage < 1) {
      return;
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(nextPage));

      return next;
    });
  }

  function refetch() {
    setRefreshTrigger((current) => current + 1);
  }

  const totalPages = Math.max(
    1,
    Math.ceil(total / DEFAULT_LIMIT),
  );

  return {
    listings,
    searchInput,
    group,
    category,
    from,
    to,
    sort,
    order,
    page,
    limit: DEFAULT_LIMIT,
    total,
    totalPages,
    isLoading,
    error,
    dateError,
    isEndpointUnavailable,
    setSearchInput,
    setGroup,
    setCategory,
    setFrom,
    setTo,
    setSort,
    setOrder,
    setPage,
    refetch,
  };
}

export default useDonorListings;