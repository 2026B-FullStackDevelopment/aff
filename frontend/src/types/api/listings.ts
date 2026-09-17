// Food listing DTOs, statuses, units, and food categories.
// Corresponds to API Design §6 (Listings Module).

import type { GeoLocation } from './common';

export type FoodCategory =
  | 'FRUIT'
  | 'VEGETABLE'
  | 'MEAT'
  | 'COOKED_DISH'
  | 'BAKED_GOODS'
  | 'DRINK';

export type ListingUnit =
  | 'KILOGRAM'
  | 'GRAM'
  | 'LITER'
  | 'MILLILITER'
  | 'UNIT'
  | 'PER_REQUEST';

export type ListingStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'SOLD_OUT';

export interface ListingDTO {
  id: string;
  donor: {
    id: string;
    companyName: string;
    city: string;
    location: GeoLocation;
  };
  name: string;
  description: string | null;
  imageUrl: string | null;
  unit: ListingUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  city: string;
  status: ListingStatus;
  donationLimit: number;
  rationLimitPerPerson: number | null;
  quantityRemaining: number;
  createdAt: string;
}

export interface ListingDetailDTO extends Omit<ListingDTO, 'donor'> {
  donor: {
    id: string;
    companyName: string;
    addressText: string;
    location: GeoLocation;
  };
}

/** A Listing row in the Admin directory, including its current cancel impact. */
export interface AdminListingDTO extends ListingDTO {
  pendingOrderCount: number;
}

export interface CancelAdminListingResponseDto {
  listing: ListingDTO;
  cancelledOrderCount: number;
  refundOutcomes: Array<{
    orderId: string;
    refundStatus: 'REFUND_PENDING' | 'FAILED';
  }>;
}
