// Contains frontend food listing API calls and uses the shared HTTP client.
import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { ListingDetailDTO, ListingDTO, PaginatedData } from '@/types/api';
import type { ListingFilters } from '../hooks/useFoodFilter';

/**
 * Builds the query string for GET /listings. The backend's
 * listingsQuerySchema is `.strict()`, so keys must be omitted entirely
 * when a filter is unset — an empty string or a default value is not
 * safe to send (e.g. priceMin=0 vs priceMin unset are different things
 * once z.coerce.number() is applied server-side).
 */
function buildListingsQuery(filters: ListingFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.city) params.set('city', filters.city);
  if (filters.category) params.set('category', filters.category);
  if (filters.priceMin) params.set('priceMin', filters.priceMin);
  if (filters.priceMax) params.set('priceMax', filters.priceMax);

  if (filters.sortOrder) {
    params.set('sort', 'price');
    params.set('order', filters.sortOrder);
  }

  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));

  return params.toString();
}

export const listingService = {
  getAvailableListings: (filters: ListingFilters) =>
    httpClient.get<PaginatedData<ListingDTO>>(
      `${API_ROUTES.listings.available}?${buildListingsQuery(filters)}`,
    ),
  getListingById: (listingId: string) =>
    httpClient.get<ListingDetailDTO>(API_ROUTES.listings.detail(listingId)),
};
