import type {
  DeliveryStage,
  FoodCategory,
  ListingDTO,
  ListingStatus,
  ListingUnit,
  OrderDTO,
} from '@/types/api';

// Request body accepted by POST /listings.
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

// Recipient summary returned by GET /users/recipients/search.
export interface RecipientSearchResult {
  id: string;
  username: string;
  email: string;
}

// Payload emitted by the private listing:sold_out Socket.IO event.
export interface SoldOutEvent {
  listingId: string;
  name: string;
}

// Request body accepted by POST /listings/:id/donations.
export interface DonorInitiatedDonationPayload {
  recipientEmail: string;
  quantity: number;
  deliveryAddressText: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
}

export type ListingGroup =
  | 'ACTIVE'
  | 'PAST';

export type ListingSortField =
  | 'createdAt'
  | 'revenue';

export type SortDirection =
  | 'asc'
  | 'desc';

// Query parameters accepted by GET /listings/mine.
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

export type ListingOrderDTO =
  OrderDTO & {
    recipient: {
      id: string;
      username: string;
    };
    delivery?: {
      stage: DeliveryStage;
    } | null;
  };