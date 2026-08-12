// Shapes listing data before sending it to the frontend or another module, and the request/response bodies for the module's other endpoints.
import type { ListingDocument, MeasurementUnit, FoodCategory, ListingStatus } from './listing.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

interface ListingDonorSummary {
  id: string;
  companyName: string | undefined;
  city: string | undefined;
  location: GeoLocation | undefined;
}

interface ListingResponseDto {
  id: string;
  donor: ListingDonorSummary;
  name: string;
  description: string | undefined;
  imageUrl: string | undefined;
  unit: MeasurementUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  city: string | undefined;
  status: ListingStatus;
  donationLimit: number;
  rationLimitPerPerson: number | undefined;
  quantityRemaining: number;
  createdAt: Date;
}

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

interface ListingWithStatsResponseDto extends ListingResponseDto {
  donatedQuantity: number;
  revenue: number;
}

interface MyListingsResponseDto {
  items: ListingWithStatsResponseDto[];
  page: number;
  limit: number;
  total: number;
}

interface UpdateListingStatusRequestDto {
  status: 'PAUSED' | 'ACTIVE' | 'CANCELLED';
}

interface UpdateListingStatusResponseDto {
  listing: ListingResponseDto;
  cancelledOrderCount: number;
}

interface CreateDonorInitiatedDonationRequestDto {
  recipientUsername: string;
  quantity: number;
  paymentMethod?: 'STRIPE' | 'CASH';
}

interface ReserveListingRequestDto {
  quantity: number;
  deliveryAddressText: string;
  deliveryLocation: { latitude: number; longitude: number };
  paymentMethod?: 'STRIPE' | 'CASH';
}

function toListingResponseDto(listing: ListingDocument | null): ListingResponseDto | null {
  if (!listing) return null;

  return {
    id: String(listing._id),
    donor: {
      id: String(listing.donorId),
      companyName: undefined,
      city: listing.city,
      location: undefined,
    },
    name: listing.name,
    description: listing.description,
    imageUrl: listing.imageUrl,
    unit: listing.unit,
    category: listing.category,
    isVegetarian: listing.isVegetarian,
    price: listing.price,
    city: listing.city,
    status: listing.status,
    donationLimit: listing.donationLimit,
    rationLimitPerPerson: listing.rationLimitPerPerson,
    quantityRemaining: listing.quantityRemaining,
    createdAt: listing.createdAt,
  };
}

export { toListingResponseDto };
export type {
  GeoLocation,
  ListingResponseDto,
  CreateListingRequestDto,
  ListingWithStatsResponseDto,
  MyListingsResponseDto,
  UpdateListingStatusRequestDto,
  UpdateListingStatusResponseDto,
  CreateDonorInitiatedDonationRequestDto,
  ReserveListingRequestDto,
};
