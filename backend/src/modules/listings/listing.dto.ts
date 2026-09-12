// Shapes Listing request and response data sent between the backend,
// frontend, and other backend modules.
import type {
  ListingDocument,
  MeasurementUnit,
  FoodCategory,
  ListingStatus,
} from './listing.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';
import {
  toOrderResponseDto,
  type OrderResponseDto,
} from '../orders/order.dto.js';
import type {
  OrderDocument,
  PaymentMethod,
} from '../orders/order.model.js';

/**
 * Donor data required when constructing Listing response DTOs.
 *
 * The Listing document stores donorId and city, but companyName,
 * addressText, and location come from the Donor profile.
 */
interface ListingDonorData {
  id: string;
  companyName: string;
  city: string;
  addressText: string;
  location: GeoLocation;
}

/**
 * Enriched data passed from the Listing service to the DTO mapper.
 */
interface ListingDtoSource {
  listing: ListingDocument;
  donor: ListingDonorData;
}

/**
 * Donor information included in standard ListingDTO responses.
 */
interface ListingDonorSummary {
  id: string;
  companyName: string;
  city: string;
  location: GeoLocation;
}

/**
 * Expanded Donor information returned by GET /listings/:id.
 *
 * The address and location are required for PER_REQUEST listings,
 * where the Recipient collects food directly from the Donor.
 */
interface ListingDonorDetail {
  id: string;
  companyName: string;
  addressText: string;
  location: GeoLocation;
}

interface ListingResponseDto {
  id: string;
  donor: ListingDonorSummary;
  name: string;
  description: string | null;
  imageUrl: string | null;
  unit: MeasurementUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  city: string;
  status: ListingStatus;
  donationLimit: number;
  rationLimitPerPerson: number | null;
  quantityRemaining: number;
  createdAt: Date;
}

/**
 * Uses all ListingResponseDto fields except donor, then replaces donor
 * with the expanded ListingDonorDetail type.
 */
interface ListingDetailResponseDto
  extends Omit<ListingResponseDto, 'donor'> {
  donor: ListingDonorDetail;
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

/**
 * Enriched Listing source containing calculated donation statistics.
 */
interface ListingWithStatsDtoSource extends ListingDtoSource {
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

// dto interface restricts the attributes being transfered
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

/**
 * Data needed to build an order row for a Donor's Listing.
 */
interface ListingOrderDtoSource {
  order: OrderDocument;
  recipient: {
    id: string;
    username: string;
  };
  listing: {
    id: string;
    name: string;
    imageUrl: string | undefined;
    unit: MeasurementUnit;
    category: FoodCategory;
  };
}

/**
 * GET /listings/:id/orders returns OrderDTO with an additional
 * Recipient summary.
 */
interface ListingOrderResponseDto extends OrderResponseDto {
  recipient: {
    id: string;
    username: string;
  };
}

interface ListingOrdersResponseDto {
  items: ListingOrderResponseDto[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Maps the fields shared by standard and detailed Listing responses.
 */
function mapListingFields(
  source: ListingDtoSource,
): Omit<ListingResponseDto, 'donor'> {
  const { listing, donor } = source;

  return {
    id: String(listing._id),
    name: listing.name,
    description: listing.description ?? null,
    imageUrl: listing.imageUrl ?? null,
    unit: listing.unit,
    category: listing.category,
    isVegetarian: listing.isVegetarian,
    price: listing.price,
    city: listing.city ?? donor.city,
    status: listing.status,
    donationLimit: listing.donationLimit,
    rationLimitPerPerson: listing.rationLimitPerPerson ?? null,
    quantityRemaining: listing.quantityRemaining,
    createdAt: listing.createdAt,
  };
}

/**
 * Maps an enriched Listing to the standard ListingDTO response.
 */
function toListingResponseDto(
  source: ListingDtoSource | null,
): ListingResponseDto | null {
  if (!source) {
    return null;
  }

  return {
    ...mapListingFields(source),
    donor: {
      id: source.donor.id,
      companyName: source.donor.companyName,
      city: source.donor.city,
      location: source.donor.location,
    },
  };
}

/**
 * Maps an enriched Listing to the detailed response used by
 * GET /listings/:id.
 */
function toListingDetailResponseDto(
  source: ListingDtoSource | null,
): ListingDetailResponseDto | null {
  if (!source) {
    return null;
  }

  return {
    ...mapListingFields(source),
    donor: {
      id: source.donor.id,
      companyName: source.donor.companyName,
      addressText: source.donor.addressText,
      location: source.donor.location,
    },
  };
}

/**
 * Maps an enriched Listing and its calculated statistics.
 */
function toListingWithStatsResponseDto(
  source: ListingWithStatsDtoSource,
): ListingWithStatsResponseDto {
  return {
    ...mapListingFields(source),
    donor: {
      id: source.donor.id,
      companyName: source.donor.companyName,
      city: source.donor.city,
      location: source.donor.location,
    },
    donatedQuantity: source.donatedQuantity,
    revenue: source.revenue,
  };
}

/**
 * Maps an Order and its Recipient into the row returned by
 * GET /listings/:id/orders.
 */
function toListingOrderResponseDto(
  source: ListingOrderDtoSource,
): ListingOrderResponseDto {
  const order = toOrderResponseDto(source.order);

  if (!order) {
    throw new Error('Cannot map a missing Order.');
  }

  return {
    ...order,
    listing: source.listing,
    recipient: source.recipient,
  };
}

export {
  toListingResponseDto,
  toListingDetailResponseDto,
  toListingWithStatsResponseDto,
  toListingOrderResponseDto,
};

export type {
  GeoLocation,
  ListingDonorData,
  ListingDtoSource,
  ListingDonorSummary,
  ListingDonorDetail,
  ListingResponseDto,
  ListingDetailResponseDto,
  CreateListingRequestDto,
  ListingWithStatsDtoSource,
  ListingWithStatsResponseDto,
  MyListingsResponseDto,
  UpdateListingStatusRequestDto,
  UpdateListingStatusResponseDto,
  CreateDonorInitiatedDonationRequestDto,
  ReserveListingRequestDto,
  ListingOrderDtoSource,
  ListingOrderResponseDto,
  ListingOrdersResponseDto,
};
