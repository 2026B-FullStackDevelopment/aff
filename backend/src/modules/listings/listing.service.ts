// Contains listing business rules and calls the listing repository for database work.
import * as listingRepository from './listing.repository.js';
import { userInterface } from '../users/user.interface.js';
import type {
  MeasurementUnit,
  FoodCategory,
  ListingDocument,
} from './listing.model.js';
import type {
  ListingDonorData,
  ListingDtoSource,
  ListingWithStatsDtoSource
} from './listing.dto.js';
import type {
  MineListingsQuery,
} from './listing.schemas.js';

interface CreateListingPayload {
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

// Paginated result from Listing service
interface MyListingsServiceResult {
  items: ListingWithStatsDtoSource[];
  page: number;
  limit: number;
  total: number;
}

async function getListingDonorData(
  donorId: string,
): Promise<ListingDonorData> {
  const [user, donorProfile] = await Promise.all([
    userInterface.getUserById(donorId),
    userInterface.getDonorByUserId(donorId),
  ]);

  if (!user.city) {
    const error: Error = new Error('Donor city is missing.');
    error.statusCode = 500;
    throw error;
  }

  return {
    id: String(user._id),
    companyName: donorProfile.companyName,
    city: user.city,
    addressText: donorProfile.addressText,
    location: donorProfile.location,
  };
}

async function enrichListing(
  listing: ListingDocument,
): Promise<ListingDtoSource> {
  return {
    listing,
    donor: await getListingDonorData(String(listing.donorId)),
  };
}

async function listAvailableListings(
  filters: Record<string, unknown> = {},
): Promise<ListingDtoSource[]> {
  const listings = await listingRepository.findAvailableListings(filters);
  return Promise.all(listings.map(enrichListing));
}

async function createListing(
  donorId: string,
  payload: CreateListingPayload,
): Promise<ListingDtoSource> {
  const donor = await getListingDonorData(donorId);

  const listing = await listingRepository.createListing({
    donorId,
    name: payload.name,
    description: payload.description,
    imageUrl: payload.imageUrl,
    unit: payload.unit,
    category: payload.category,
    isVegetarian: payload.isVegetarian,
    price: payload.price,
    city: donor.city,
    donationLimit: payload.donationLimit,
    rationLimitPerPerson: payload.rationLimitPerPerson,
    quantityRemaining: payload.donationLimit,
  });

  return { listing, donor };
}

async function getListingById(
  id: string,
): Promise<ListingDtoSource | null> {
  const listing = await listingRepository.findListingById(id);

  if (!listing) {
    return null;
  }

  return enrichListing(listing);
}

export { listAvailableListings, createListing, getListingById };
