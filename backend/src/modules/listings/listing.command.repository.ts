// Contains Listing creation and general state-change commands.
import Listing from './listing.model.js';
import type { ListingDocument, ListingStatus } from './listing.types.js';
import { Types } from 'mongoose';
import type { CreateListingInput, UpdateListingStatusOptions } from './listing.command.types.js';

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
export type { CreateListingInput, UpdateListingStatusOptions } from './listing.command.types.js';
