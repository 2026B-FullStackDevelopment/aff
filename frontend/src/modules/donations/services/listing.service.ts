import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { ListingDTO } from '@/types/api';
import type { CreateListingPayload } from '../types';

export const listingService = {
  //Creates an active food listing owned by the authenticated Donor.

  createListing: (payload: CreateListingPayload) =>
    httpClient.post<ListingDTO>(
      API_ROUTES.listings.create,
      payload,
    ),
};