// Exposes safe listing operations for other modules without importing listing.service directly.
import * as listingService from './listing.service.js';

const listingInterface = {
  getListingById: listingService.getListingById,
  markListingReserved: listingService.markListingReserved,
};

export { listingInterface };
