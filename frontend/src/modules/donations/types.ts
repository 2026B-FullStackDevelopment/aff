import type {
  DeliveryStage,
  FoodCategory,
  ListingDTO,
  ListingStatus,
  ListingUnit,
  OrderDTO,
} from '@/types/api';

// Request body accepted by POST /listings.
// City and quantityRemaining are derived by the backend.
export interface CreateListingPayload {
  name: string;
  description?: string;
  imageUrl?: string;
  unit: ListingUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  donationLimit: number;
  rationLimitPerPerson?: number;
}

export type ListingGroup = 'ACTIVE' | 'PAST';

export type ListingSortField =
  | 'createdAt'
  | 'revenue';

export type SortDirection =
  | 'asc'
  | 'desc';

// Query parameters accepted by GET /listings/mine.
// Donor ownership is inferred from the authenticated session.
export interface MyListingsQuery {
  status: ListingGroup;
  search?: string;
  category?: FoodCategory;
  from?: string;
  to?: string;
  sort?: ListingSortField;
  order?: SortDirection;
  page?: number;
  limit?: number;
}

export interface ManagedListingDTO
  extends ListingDTO {
  donatedQuantity: number;
  revenue: number;
}

export type DonorListingStatusUpdate =
  Exclude<ListingStatus, 'SOLD_OUT'>;

export interface UpdateListingStatusPayload {
  status: DonorListingStatusUpdate;
}

export interface UpdateListingStatusResponse {
  listing: ListingDTO;
  cancelledOrderCount: number;
}

export type ListingOrderDTO = OrderDTO & {
  recipient: {
    id: string;
    username: string;
  };
  delivery: {
    stage: DeliveryStage;
  } | null;
};