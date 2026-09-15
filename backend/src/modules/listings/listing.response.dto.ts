// Shapes Listing data returned by backend HTTP endpoints.
import type {
  ListingDocument,
  MeasurementUnit,
  FoodCategory,
  ListingStatus,
} from './listing.types.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';
import {
  toOrderResponseDto,
  type OrderResponseDto,
} from '../orders/order.dto.js';
import type { OrderDocument } from '../orders/order.types.js';

/** Donor data required when constructing Listing response DTOs. */
interface ListingDonorData {
  id: string;
  companyName: string;
  city: string;
  addressText: string;
  location: GeoLocation;
}

/** Enriched data passed from the Listing service to the DTO mapper. */
interface ListingDtoSource {
  listing: ListingDocument;
  donor: ListingDonorData;
}

/** Donor information included in standard Listing responses. */
interface ListingDonorSummary {
  id: string;
  companyName: string;
  city: string;
  location: GeoLocation;
}

/** Expanded Donor information returned by `GET /listings/:id`. */
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

interface ListingDetailResponseDto extends Omit<ListingResponseDto, 'donor'> {
  donor: ListingDonorDetail;
}

interface ListingWithStatsResponseDto extends ListingResponseDto {
  donatedQuantity: number;
  revenue: number;
}

/** Enriched Listing source containing calculated donation statistics. */
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

interface RefundOutcomeDto {
  orderId: string;
  refundStatus: 'REFUND_PENDING' | 'FAILED';
}

interface UpdateListingStatusResponseDto {
  listing: ListingResponseDto;
  cancelledOrderCount: number;
  refundOutcomes: RefundOutcomeDto[];
}

/** Data needed to build an order row for a Donor's Listing. */
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

/** Order response extended with the Recipient summary needed by a Donor. */
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

interface DonorAnalyticsCategoryResponseDto {
  category: FoodCategory;
  listingCount: number;
  revenue: number;
}

interface DonorAnalyticsTopListingResponseDto {
  id: string;
  name: string;
  revenue: number;
}

interface DonorAnalyticsResponseDto {
  totalRevenue: number;
  totalListings: number;
  currentListings: number;
  soldOutListings: number;
  categories: DonorAnalyticsCategoryResponseDto[];
  topListings: DonorAnalyticsTopListingResponseDto[];
}

/** Maps fields shared by standard and detailed Listing responses. */
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

/** Maps an enriched Listing to the standard Listing response. */
function toListingResponseDto(
  source: ListingDtoSource | null,
): ListingResponseDto | null {
  if (!source) return null;

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

/** Maps an enriched Listing to the detailed Listing response. */
function toListingDetailResponseDto(
  source: ListingDtoSource | null,
): ListingDetailResponseDto | null {
  if (!source) return null;

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

/** Maps an enriched Listing and its calculated statistics. */
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

/** Maps an Order and its Recipient into a Donor-facing Listing order row. */
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
  ListingWithStatsDtoSource,
  ListingWithStatsResponseDto,
  MyListingsResponseDto,
  RefundOutcomeDto,
  UpdateListingStatusResponseDto,
  ListingOrderDtoSource,
  ListingOrderResponseDto,
  ListingOrdersResponseDto,
  DonorAnalyticsCategoryResponseDto,
  DonorAnalyticsTopListingResponseDto,
  DonorAnalyticsResponseDto,
};
