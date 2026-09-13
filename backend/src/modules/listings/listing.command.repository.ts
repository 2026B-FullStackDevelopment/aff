// Contains Listing creation and general state-change commands.
import Listing, {
  type ListingDocument,
  type MeasurementUnit,
  type FoodCategory,
  type ListingStatus,
} from './listing.model.js';
import { Types, type ClientSession } from 'mongoose';

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
  status?: ListingStatus;
  donationLimit: number;
  rationLimitPerPerson?: number;
  quantityRemaining: number;
}

interface UpdateListingStatusOptions {
  session?: ClientSession;
  closedAt?: Date;
}

/** Creates a Listing from an already-validated service payload. */
function createListing(data: CreateListingInput) {
  return Listing.create(data);
}

/** Applies an ordinary Listing patch and returns the updated lean document. */
function updateListing(
  id: string | Types.ObjectId,
  data: Partial<CreateListingInput>,
) {
  return Listing.findByIdAndUpdate(id, data, { new: true }).lean<ListingDocument>();
}

/**
 * Atomically changes a Donor-owned Listing only if its status still matches
 * the value the service validated.
 */
function updateListingStatusIfCurrent(
  id: string | Types.ObjectId,
  donorId: string | Types.ObjectId,
  currentStatus: ListingStatus,
  nextStatus: ListingStatus,
  { session, closedAt }: UpdateListingStatusOptions = {},
) {
  return Listing.findOneAndUpdate(
    { _id: id, donorId, status: currentStatus },
    { $set: { status: nextStatus, ...(closedAt && { closedAt }) } },
    { new: true, runValidators: true, session },
  ).lean<ListingDocument>();
}

export { createListing, updateListing, updateListingStatusIfCurrent };
export type { CreateListingInput, UpdateListingStatusOptions };
