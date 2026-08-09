// Contains listing database queries so services do not call Mongoose directly.
import Listing from './listing.model.js';

function findAvailableListings(filters = {}) {
  return Listing.find({ ...filters, status: 'AVAILABLE' }).lean();
}

function createListing(data) {
  return Listing.create(data);
}

function findListingById(id) {
  return Listing.findById(id).lean();
}

function updateListing(id, data) {
  return Listing.findByIdAndUpdate(id, data, { new: true }).lean();
}

export { findAvailableListings, createListing, findListingById, updateListing };
