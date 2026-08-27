// Contains frontend food listing API calls and uses the shared HTTP client.
import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { FoodListing, ListingDetailDTO } from '@/types/api';

export const listingService = {
  listFood: (_filters: Record<string, unknown> = {}) =>
    httpClient.get<FoodListing[]>(API_ROUTES.food.list),
  createFood: (payload: unknown) =>
    httpClient.post<FoodListing>(API_ROUTES.food.create, payload),
  getListingById: (listingId: string) =>
      httpClient.get<ListingDetailDTO>(API_ROUTES.listings.detail(listingId)),
};
