// Exposes Listing stock operations to the service and cross-module interface layers.
import type { ClientSession } from 'mongoose';
import * as listingStockRepository from './listing.stock.repository.js';

/** Restores stock on a cancelled Order's Listing. */
function restoreStock(
  listingId: string,
  quantity: number,
  session?: ClientSession,
) {
  return listingStockRepository.restoreStockAtomically(listingId, quantity, session);
}

export { restoreStock };
