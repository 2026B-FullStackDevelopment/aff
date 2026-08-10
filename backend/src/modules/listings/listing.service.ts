// Contains listing business rules and calls the listing repository for database work.
import * as listingRepository from './listing.repository.js';
import { userInterface } from '../users/user.interface.js';
import type { MeasurementUnit, FoodCategory } from './listing.model.js';

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

async function listAvailableListings(filters: Record<string, unknown> = {}) {
  return listingRepository.findAvailableListings(filters);
}

async function createListing(donorId: string, payload: CreateListingPayload) {
  const donor = await userInterface.getUserById(donorId);

  return listingRepository.createListing({
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
}

async function getListingById(id: string) {
  return listingRepository.findListingById(id);
}

export { listAvailableListings, createListing, getListingById };
