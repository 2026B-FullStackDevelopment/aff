import type {
  FoodCategory,
  ListingUnit,
} from '@/types/api';

//Request body accepted by POST /listings.
// City and quantityRemaining are intentionally excluded because the backend derives both values.

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