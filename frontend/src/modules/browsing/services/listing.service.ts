// Contains frontend food listing API calls and uses the shared HTTP client.
import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { ListingDetailDTO, ListingDTO, PaginatedData } from '@/types/api';

export const listingService = {
  getAvailableListings: ({ page, limit }: { page: number; limit: number }) =>
    httpClient.get<PaginatedData<ListingDTO>>(
      `${API_ROUTES.listings.available}?page=${page}&limit=${limit}`
    ),
  getListingById: (listingId: string) =>
    httpClient.get<ListingDetailDTO>(API_ROUTES.listings.detail(listingId)),
};
