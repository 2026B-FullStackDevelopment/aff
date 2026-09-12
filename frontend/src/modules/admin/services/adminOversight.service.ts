import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type {
  AdminDeliveryDTO,
  AdminListingDTO,
  CancelAdminListingResponseDto,
  DeliveryStage,
  PaginatedData,
} from '@/types/api';

interface AdminListingsParams {
  page: number;
  limit: number;
  search?: string;
}

interface AdminDeliveriesParams {
  page: number;
  limit: number;
  stage?: DeliveryStage;
}

function withQuery(path: string, values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });

  return `${path}?${query.toString()}`;
}

/** REST calls used by the Admin listing and Delivery oversight screens. */
export const adminOversightService = {
  listListings: ({ page, limit, search }: AdminListingsParams) =>
    httpClient.get<PaginatedData<AdminListingDTO>>(
      withQuery(API_ROUTES.admin.listings, { page, limit, search }),
    ),

  cancelListing: (listingId: string) =>
    httpClient.patch<CancelAdminListingResponseDto>(
      API_ROUTES.admin.cancelListing(listingId),
      {},
    ),

  listDeliveries: ({ page, limit, stage }: AdminDeliveriesParams) =>
    httpClient.get<PaginatedData<AdminDeliveryDTO>>(
      withQuery(API_ROUTES.admin.deliveries, { page, limit, stage }),
    ),
};

export type { AdminListingsParams, AdminDeliveriesParams };
