// Defines internal types used by Listing query repositories and services.
import type { GeoLocation, ListingDtoSource, ListingWithStatsDtoSource } from './listing.response.dto.js';
import type { ListingDocument } from './listing.types.js';

type ListingWithStatsRecord = ListingDocument & {
  donatedQuantity: number;
  revenue: number;
};

interface MyListingsRepositoryResult {
  items: ListingWithStatsRecord[];
  page: number;
  limit: number;
  total: number;
}

interface MyListingsAggregationResult {
  items: ListingWithStatsRecord[];
  metadata: Array<{ total: number }>;
}

interface AvailableListingsRepositoryResult {
  items: ListingDocument[];
  page: number;
  limit: number;
  total: number;
}

interface AvailableListingsAggregationResult {
  items: ListingDocument[];
  metadata: Array<{ total: number }>;
}

interface AdminListingFilter {
  page: number;
  limit: number;
  hasSearch: boolean;
  donorIds?: string[];
  listingId?: string;
}

/** Validated pagination and search input accepted by the Admin listing query. */
interface AdminListingsQuery {
  search?: string;
  page: number;
  limit: number;
}

interface AdminListingsRepositoryResult {
  items: ListingDocument[];
  page: number;
  limit: number;
  total: number;
}

interface AdminListingDtoSource extends ListingDtoSource {
  pendingOrderCount: number;
}

interface AdminListingsServiceResult {
  items: AdminListingDtoSource[];
  page: number;
  limit: number;
  total: number;
}

interface MyListingsServiceResult {
  items: ListingWithStatsDtoSource[];
  page: number;
  limit: number;
  total: number;
}

interface AvailableListingsServiceResult {
  items: ListingDtoSource[];
  page: number;
  limit: number;
  total: number;
}

interface ListingDonorSummaryByListing {
  listingId: string;
  listingName: string;
  companyName: string;
  addressText: string;
  location: GeoLocation;
}

export type {
  ListingWithStatsRecord,
  MyListingsRepositoryResult,
  MyListingsAggregationResult,
  AvailableListingsRepositoryResult,
  AvailableListingsAggregationResult,
  AdminListingFilter,
  AdminListingsQuery,
  AdminListingsRepositoryResult,
  AdminListingDtoSource,
  AdminListingsServiceResult,
  MyListingsServiceResult,
  AvailableListingsServiceResult,
  ListingDonorSummaryByListing,
};
