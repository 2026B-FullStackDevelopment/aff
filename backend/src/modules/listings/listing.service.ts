// Contains listing business rules and calls the listing repository for database work.
import * as listingRepository from './listing.repository.js';

async function listAvailableListings(filters = {}) {
  return listingRepository.findAvailableListings(filters);
}

async function createListing(donorId, payload) {
  return listingRepository.createListing({
    donorId,
    title: payload.title,
    description: payload.description,
    price: payload.price || 0,
    status: 'AVAILABLE',
    pickupLocation: payload.pickupLocation,
  });
}

async function getListingById(id) {
  return listingRepository.findListingById(id);
}

async function markListingReserved(id) {
  return listingRepository.updateListing(id, { status: 'RESERVED' });
}

export { listAvailableListings, createListing, getListingById, markListingReserved };
