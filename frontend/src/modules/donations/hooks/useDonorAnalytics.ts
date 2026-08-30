import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FoodCategory } from '@/types/api';
import { listingService } from '../services/listing.service';
import { getResponseMessage } from '@/shared/utils/apiError';
import type {
  ListingGroup,
  ManagedListingDTO,
} from '../types';

const PAGE_LIMIT = 100;

const CATEGORY_DEFINITIONS: ReadonlyArray<{
  category: FoodCategory;
  label: string;
}> = [
  {
    category: 'VEGETABLE',
    label: 'Vegetable',
  },
  {
    category: 'COOKED_DISH',
    label: 'Cooked Dish',
  },
  {
    category: 'FRUIT',
    label: 'Fruit',
  },
  {
    category: 'BAKED_GOODS',
    label: 'Baked Goods',
  },
  {
    category: 'MEAT',
    label: 'Meat',
  },
  {
    category: 'DRINK',
    label: 'Drink',
  },
];

export interface DonorAnalyticsCategory {
  category: FoodCategory;
  label: string;
  listingCount: number;
  revenue: number;
}

export interface DonorAnalyticsSnapshot {
  totalRevenue: number;
  totalListings: number;
  currentListings: number;
  soldOutListings: number;
  categories: DonorAnalyticsCategory[];
  topListings: ManagedListingDTO[];
}


async function loadListingGroup(
  group: ListingGroup,
): Promise<ManagedListingDTO[]> {
  const listings: ManagedListingDTO[] = [];
  let page = 1;

  while (true) {
    const response =
      await listingService.getMyListings({
        status: group,
        sort: 'createdAt',
        order: 'desc',
        page,
        limit: PAGE_LIMIT,
      });

    if (!response.ok || !response.data) {
      throw new Error(
        getResponseMessage(
          response.data,
          'Unable to load analytics data.',
        ),
      );
    }

    listings.push(...response.data.items);

    const reachedLastPage =
      listings.length >= response.data.total
      || response.data.items.length < PAGE_LIMIT;

    if (reachedLastPage) {
      return listings;
    }

    page += 1;
  }
}

function buildAnalyticsSnapshot(
  listings: ManagedListingDTO[],
): DonorAnalyticsSnapshot {
  const totalRevenue = listings.reduce(
    (total, listing) =>
      total + listing.revenue,
    0,
  );

  const currentListings = listings.filter(
    (listing) =>
      listing.status === 'ACTIVE'
      || listing.status === 'PAUSED',
  ).length;

  const soldOutListings = listings.filter(
    (listing) =>
      listing.status === 'SOLD_OUT',
  ).length;

  const categories =
    CATEGORY_DEFINITIONS.map(
      ({ category, label }) => {
        const categoryListings =
          listings.filter(
            (listing) =>
              listing.category === category,
          );

        return {
          category,
          label,
          listingCount:
            categoryListings.length,
          revenue:
            categoryListings.reduce(
              (total, listing) =>
                total + listing.revenue,
              0,
            ),
        };
      },
    );

  const topListings = [...listings]
    .sort((first, second) => {
      if (second.revenue !== first.revenue) {
        return second.revenue - first.revenue;
      }

      return (
        new Date(second.createdAt).getTime()
        - new Date(first.createdAt).getTime()
      );
    })
    .slice(0, 5);

  return {
    totalRevenue,
    totalListings: listings.length,
    currentListings,
    soldOutListings,
    categories,
    topListings,
  };
}

// Loads both listing groups and derives an analytics snapshot locally.
export function useDonorAnalytics() {
  const [listings, setListings] =
    useState<ManagedListingDTO[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] =
    useState(0);

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);

      try {
        const [activeListings, pastListings] =
          await Promise.all([
            loadListingGroup('ACTIVE'),
            loadListingGroup('PAST'),
          ]);

        if (!isCurrentRequest) {
          return;
        }

        const listingsById =
          new Map<string, ManagedListingDTO>();

        for (const listing of [
          ...activeListings,
          ...pastListings,
        ]) {
          listingsById.set(
            listing.id,
            listing,
          );
        }

        setListings(
          Array.from(listingsById.values()),
        );
      } catch (loadError) {
        if (!isCurrentRequest) {
          return;
        }

        setListings([]);
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

  const snapshot = useMemo(
    () => buildAnalyticsSnapshot(listings),
    [listings],
  );

  function refresh() {
    setRefreshTrigger(
      (current) => current + 1,
    );
  }

  return {
    snapshot,
    isLoading,
    error,
    refresh,
  };
}