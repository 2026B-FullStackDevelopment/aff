// Contains read-only Listing service workflows and DTO-source enrichment.
import { userInterface } from '../users/user.interface.js';
import * as listingQueryRepository from './listing.query.repository.js';
import { enrichListing, getListingDonorData } from './listing.access.service.js';
import { createHttpError } from './listing.service.errors.js';
import type { ListingDocument } from './listing.types.js';
import type { ListingDtoSource } from './listing.response.dto.js';
import type { MineListingsQuery, ListingsQuery } from './listing.schemas.js';
import type { AvailableListingsServiceResult, ListingDonorSummaryByListing, MyListingsServiceResult } from './listing.query.types.js';

async function listMyListings(
  donorId: string,
  query: MineListingsQuery,
): Promise<MyListingsServiceResult> {
  const result = await listingQueryRepository.findMyListingsWithStats(donorId, query);

  if (result.items.length === 0) {
    return { items: [], page: result.page, limit: result.limit, total: result.total };
  }

  const donor = await getListingDonorData(donorId);

  return {
    items: result.items.map((item) => {
      const { donatedQuantity, revenue, ...listing } = item;
      return {
        listing: listing as ListingDocument,
        donor,
        donatedQuantity,
        revenue,
      };
    }),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}

async function listAvailableListings(
  query: ListingsQuery,
): Promise<AvailableListingsServiceResult> {
  const result = await listingQueryRepository.findAvailableListings(query);

  return {
    items: await Promise.all(result.items.map(enrichListing)),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}

async function getListingById(id: string): Promise<ListingDtoSource> {
  const listing = await listingQueryRepository.findListingById(id);

  if (!listing) {
    throw createHttpError(404, 'Listing not found.');
  }

  return enrichListing(listing);
}

/** Resolves Listing and Donor summaries in bulk for cross-module callers. */
async function findDonorSummariesByListingIds(
  listingIds: string[],
): Promise<ListingDonorSummaryByListing[]> {
  if (listingIds.length === 0) return [];

  const listings = await listingQueryRepository.findListingsByIds(listingIds);
  if (listings.length === 0) return [];

  const donorIds = [...new Set(listings.map((listing) => String(listing.donorId)))];
  const donors = await userInterface.findDonorsByUserIds(donorIds);
  const donorById = new Map(donors.map((donor) => [String(donor.userId), donor]));

  return listings.flatMap((listing) => {
    const donor = donorById.get(String(listing.donorId));

    return donor === undefined
      ? []
      : [{
          listingId: String(listing._id),
          listingName: listing.name,
          companyName: donor.companyName,
          addressText: donor.addressText,
          location: donor.location,
        }];
  });
}

export {
  listMyListings,
  listAvailableListings,
  getListingById,
  findDonorSummariesByListingIds,
};
export type { ListingDonorSummaryByListing } from './listing.query.types.js';
