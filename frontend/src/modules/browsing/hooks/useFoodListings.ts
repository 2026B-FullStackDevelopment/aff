// Loads food listings and keeps page state separate from FoodListingsPage JSX.
//
// DEVIATION NOTE: this replaces the earlier foodService.listFood(filters)
// version. The backend for GET /listings (api_design.md §6) isn't built
// yet, so `mockFetchListings` below stands in for it — but the
// `ListingFilters` shape and the `{ items, total }` response shape already
// match that endpoint's query params and paginated envelope 1:1
// (api_design.md §2.4/§6), so swapping the mock for a real
// `foodService.listFood(filters)` call later should only touch the body of
// `loadListings`, not its callers.
import { useEffect, useState } from 'react';

export type ListingCategory = 'FRUIT' | 'VEGETABLE' | 'MEAT' | 'COOKED_DISH' | 'BAKED_GOODS' | 'DRINK';

export type ListingUnit = 'KILOGRAM' | 'GRAM' | 'LITER' | 'MILLILITER' | 'UNIT' | 'PER_REQUEST';

export type ListingStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'SOLD_OUT';

// Trimmed subset of ListingDTO (api_design.md §3) needed for the browse grid.
export interface ListingSummary {
  id: string;
  donor: { id: string; companyName: string };
  name: string;
  category: ListingCategory;
  isVegetarian: boolean;
  unit: ListingUnit;
  price: number;
  city: string;
  status: ListingStatus;
  donationLimit: number;
  rationLimitPerPerson: number | null;
  quantityRemaining: number;
  createdAt: string;
}

export interface ListingFilters {
  search: string;
  city: string | null;
  categories: ListingCategory[];
  priceMin: string;
  priceMax: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export const DEFAULT_FILTERS: ListingFilters = {
  search: '',
  city: null,
  categories: [],
  priceMin: '',
  priceMax: '',
  sortOrder: 'asc',
  page: 1,
  limit: 6,
};

const MOCK_LISTINGS: ListingSummary[] = [
  {
    id: 'l1',
    donor: { id: 'd1', companyName: 'Saigon Bakehouse' },
    name: 'Artisan Bread Loaves',
    category: 'BAKED_GOODS',
    isVegetarian: true,
    unit: 'UNIT',
    price: 20000,
    city: 'Thành phố Hồ Chí Minh',
    status: 'ACTIVE',
    donationLimit: 10,
    rationLimitPerPerson: 3,
    quantityRemaining: 5,
    createdAt: '2026-07-29',
  },
  {
    id: 'l2',
    donor: { id: 'd2', companyName: 'Hanoi Home Kitchen' },
    name: 'Rice & Salmon Bento',
    category: 'COOKED_DISH',
    isVegetarian: false,
    unit: 'UNIT',
    price: 15000,
    city: 'Thành phố Hà Nội',
    status: 'ACTIVE',
    donationLimit: 12,
    rationLimitPerPerson: 2,
    quantityRemaining: 8,
    createdAt: '2026-07-29',
  },
  {
    id: 'l3',
    donor: { id: 'd1', companyName: 'Saigon Bakehouse' },
    name: 'Fresh Organic Kale & Spinach Mix',
    category: 'VEGETABLE',
    isVegetarian: true,
    unit: 'KILOGRAM',
    price: 0,
    city: 'Thành phố Hồ Chí Minh',
    status: 'ACTIVE',
    donationLimit: 20,
    rationLimitPerPerson: null,
    quantityRemaining: 15,
    createdAt: '2026-07-29',
  },
  {
    id: 'l4',
    donor: { id: 'd3', companyName: 'Đà Nẵng Green Farm' },
    name: 'Fresh Organic Mustard Greens',
    category: 'VEGETABLE',
    isVegetarian: true,
    unit: 'KILOGRAM',
    price: 0,
    city: 'Thành phố Đà Nẵng',
    status: 'ACTIVE',
    donationLimit: 20,
    rationLimitPerPerson: null,
    quantityRemaining: 15,
    createdAt: '2026-07-29',
  },
  {
    id: 'l5',
    donor: { id: 'd2', companyName: 'Hanoi Home Kitchen' },
    name: 'Seasonal Fruits Mix',
    category: 'FRUIT',
    isVegetarian: true,
    unit: 'UNIT',
    price: 12000,
    city: 'Thành phố Hồ Chí Minh',
    status: 'ACTIVE',
    donationLimit: 8,
    rationLimitPerPerson: 2,
    quantityRemaining: 3,
    createdAt: '2026-07-28',
  },
  {
    id: 'l6',
    donor: { id: 'd4', companyName: 'Cao Bằng Apiary' },
    name: 'Raw Organic Honey',
    category: 'DRINK',
    isVegetarian: false,
    unit: 'UNIT',
    price: 35000,
    city: 'Cao Bằng',
    status: 'ACTIVE',
    donationLimit: 6,
    rationLimitPerPerson: 1,
    quantityRemaining: 3,
    createdAt: '2026-07-28',
  },
];

function mockFetchListings(filters: ListingFilters): Promise<{ items: ListingSummary[]; total: number }> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      let items = [...MOCK_LISTINGS];

      if (filters.search.trim()) {
        const term = filters.search.trim().toLowerCase();
        items = items.filter((listing) => listing.name.toLowerCase().includes(term));
      }

      if (filters.city) {
        items = items.filter((listing) => listing.city === filters.city);
      }

      if (filters.categories.length > 0) {
        items = items.filter((listing) => filters.categories.includes(listing.category));
      }

      if (filters.priceMin !== '') {
        items = items.filter((listing) => listing.price >= Number(filters.priceMin));
      }

      if (filters.priceMax !== '') {
        items = items.filter((listing) => listing.price <= Number(filters.priceMax));
      }

      items.sort((a, b) => (filters.sortOrder === 'asc' ? a.price - b.price : b.price - a.price));

      const total = items.length;
      const start = (filters.page - 1) * filters.limit;
      const paged = items.slice(start, start + filters.limit);

      resolve({ items: paged, total });
    }, 300);
  });
}

export function useFoodListings() {
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: replace with `foodService.listFood(filters)` -> GET
        // /listings once the backend endpoint exists (api_design.md §6).
        const response = await mockFetchListings(filters);

        if (isMounted) {
          setListings(response.items);
          setTotal(response.total);
        }
      } catch {
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
  }, [filters]);

  function updateFilters(patch: Partial<ListingFilters>) {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      // Any change other than an explicit page change resets to page 1.
      page: patch.page ?? 1,
    }));
  }

  function setPage(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  // Client-side reflection of what a successful POST /listings/:id/reserve
  // actually changes: it decrements quantityRemaining on the LISTING and
  // creates a separate ORDER — it does NOT flip the listing itself to a
  // "reserved" status. Only quantityRemaining hitting 0 changes listing
  // status, to SOLD_OUT (api_design.md §6, §12 listing:sold_out).
  function markReserved(listingId: string, quantity: number) {
    setListings((prev) =>
      prev.map((listing) => {
        if (listing.id !== listingId) return listing;

        const quantityRemaining = Math.max(0, listing.quantityRemaining - quantity);

        return {
          ...listing,
          quantityRemaining,
          status: quantityRemaining === 0 ? 'SOLD_OUT' : listing.status,
        };
      }),
    );
  }

  return { listings, total, filters, updateFilters, setPage, isLoading, error, markReserved };
}
