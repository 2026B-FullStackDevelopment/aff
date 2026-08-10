// Contains listing database queries so services do not call Mongoose directly.
import Listing, { type ListingDocument, type MeasurementUnit, type FoodCategory } from './listing.model.js';
import type { Types } from 'mongoose';

interface CreateListingInput {
  donorId: string | Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  unit: MeasurementUnit;
  category: FoodCategory;
  isVegetarian: boolean;
  price: number;
  city?: string;
  donationLimit: number;
  rationLimitPerPerson?: number;
  quantityRemaining: number;
}

function findAvailableListings(filters: Record<string, unknown> = {}) {
  return Listing.find({ ...filters, status: 'ACTIVE' }).lean<ListingDocument[]>();
}

function createListing(data: CreateListingInput) {
  return Listing.create(data);
}

function findListingById(id: string | Types.ObjectId) {
  return Listing.findById(id).lean<ListingDocument>();
}

function updateListing(id: string | Types.ObjectId, data: Partial<CreateListingInput>) {
  return Listing.findByIdAndUpdate(id, data, { new: true }).lean<ListingDocument>();
}

export { findAvailableListings, createListing, findListingById, updateListing };
