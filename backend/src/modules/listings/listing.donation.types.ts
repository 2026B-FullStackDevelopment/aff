// Defines internal service results for Donor-facing Listing donation workflows.
import type { ListingOrderDtoSource } from './listing.response.dto.js';

interface ListingOrdersServiceResult {
  items: ListingOrderDtoSource[];
  page: number;
  limit: number;
  total: number;
}

export type { ListingOrdersServiceResult };
