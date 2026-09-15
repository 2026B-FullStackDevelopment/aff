// Owns Listing service-layer ownership checks and Donor data resolution.
import type { ClientSession } from 'mongoose';
import { userInterface } from '../users/user.interface.js';
import * as listingQueryRepository from './listing.query.repository.js';
import type { ListingDocument } from './listing.types.js';
import type { ListingDonorData, ListingDtoSource } from './listing.response.dto.js';
import { createHttpError } from './listing.service.errors.js';

async function getListingDonorData(donorId: string): Promise<ListingDonorData> {
  const [user, donorProfile] = await Promise.all([
    userInterface.getUserById(donorId),
    userInterface.getDonorByUserId(donorId),
  ]);

  if (!user.city) {
    throw createHttpError(500, 'Donor city is missing.');
  }

  return {
    id: String(user._id),
    companyName: donorProfile.companyName,
    city: user.city,
    addressText: donorProfile.addressText,
    location: donorProfile.location,
  };
}

async function enrichListing(listing: ListingDocument): Promise<ListingDtoSource> {
  return {
    listing,
    donor: await getListingDonorData(String(listing.donorId)),
  };
}

async function requireOwnedListing(
  listingId: string,
  donorId: string,
  session?: ClientSession,
): Promise<ListingDocument> {
  const listing = await listingQueryRepository.findListingById(listingId, session);

  if (!listing) {
    throw createHttpError(404, 'Listing not found.');
  }

  if (String(listing.donorId) !== donorId) {
    throw createHttpError(403, 'You do not own this listing.');
  }

  return listing;
}

export { getListingDonorData, enrichListing, requireOwnedListing };
