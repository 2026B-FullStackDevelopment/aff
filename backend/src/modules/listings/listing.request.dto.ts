// Defines request bodies accepted by Listing HTTP endpoints.
import type { FoodCategory, MeasurementUnit } from './listing.types.js';

interface CreateListingRequestDto {
  name: string;
  description?: string;
  imageUrl?: string;
  unit: MeasurementUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  donationLimit: number;
  rationLimitPerPerson?: number;
}

interface UpdateListingStatusRequestDto {
  status: 'PAUSED' | 'ACTIVE' | 'CANCELLED';
}

interface CreateDonorInitiatedDonationRequestDto {
  recipientEmail: string;
  quantity: number;
}

interface ReserveListingRequestDto {
  quantity: number;
  deliveryAddressText: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
  paymentMethod?: 'STRIPE' | 'CASH';
}

export type {
  CreateListingRequestDto,
  UpdateListingStatusRequestDto,
  CreateDonorInitiatedDonationRequestDto,
  ReserveListingRequestDto,
};
