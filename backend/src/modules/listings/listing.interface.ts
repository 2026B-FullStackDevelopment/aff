// Exposes safe listing operations for other modules without importing service implementations directly.
import * as listingQueryService from './listing.query.service.js';
import * as listingStockService from './listing.stock.service.js';

const listingInterface = {
  getListingById: listingQueryService.getListingById,
  restoreStock: listingStockService.restoreStock,
  findDonorSummariesByListingIds: listingQueryService.findDonorSummariesByListingIds,
};

export { listingInterface };
