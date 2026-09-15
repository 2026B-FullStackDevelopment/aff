// Contains atomic Listing inventory updates used by donation and order flows.
import Listing from './listing.model.js';
import type { ListingDocument } from './listing.types.js';
import { Types, type ClientSession } from 'mongoose';

/**
 * Decrements stock only while the Donor-owned Listing is active and has
 * enough quantity. An exact-zero result becomes SOLD_OUT atomically.
 */
function decrementStockAtomically(
  listingId: string | Types.ObjectId,
  donorId: string | Types.ObjectId,
  quantity: number,
  session?: ClientSession,
) {
  const soldOutAt = new Date();

  return Listing.findOneAndUpdate(
    {
      _id: listingId,
      donorId,
      status: 'ACTIVE',
      unit: { $ne: 'PER_REQUEST' },
      quantityRemaining: { $gte: quantity },
    },
    [
      {
        $set: {
          quantityRemaining: {
            $subtract: ['$quantityRemaining', quantity],
          },
        },
      },
      {
        $set: {
          status: {
            $cond: [
              { $eq: ['$quantityRemaining', 0] },
              'SOLD_OUT',
              '$status',
            ],
          },
          closedAt: {
            $cond: [
              { $eq: ['$quantityRemaining', 0] },
              soldOutAt,
              '$closedAt',
            ],
          },
        },
      },
    ],
    // Mongoose 9 requires this opt-in for an aggregation update pipeline.
    { new: true, session, updatePipeline: true },
  ).lean<ListingDocument>();
}

/**
 * Decrements stock for a Recipient reservation. This has the same atomic
 * guards as the Donor flow but deliberately has no donor ownership filter.
 */
function decrementStockForReserveAtomically(
  listingId: string | Types.ObjectId,
  quantity: number,
  session?: ClientSession,
) {
  const soldOutAt = new Date();

  return Listing.findOneAndUpdate(
    {
      _id: listingId,
      status: 'ACTIVE',
      unit: { $ne: 'PER_REQUEST' },
      quantityRemaining: { $gte: quantity },
    },
    [
      {
        $set: {
          quantityRemaining: {
            $subtract: ['$quantityRemaining', quantity],
          },
        },
      },
      {
        $set: {
          status: {
            $cond: [
              { $eq: ['$quantityRemaining', 0] },
              'SOLD_OUT',
              '$status',
            ],
          },
          closedAt: {
            $cond: [
              { $eq: ['$quantityRemaining', 0] },
              soldOutAt,
              '$closedAt',
            ],
          },
        },
      },
    ],
    { new: true, session, updatePipeline: true },
  ).lean<ListingDocument>();
}

/**
 * Restores stock after an Order cancellation. SOLD_OUT returns to ACTIVE and
 * clears closedAt; PAUSED and CANCELLED retain their existing status.
 */
function restoreStockAtomically(
  listingId: string | Types.ObjectId,
  quantity: number,
  session?: ClientSession,
) {
  return Listing.findOneAndUpdate(
    { _id: listingId },
    [
      {
        $set: {
          quantityRemaining: {
            $add: ['$quantityRemaining', quantity],
          },
        },
      },
      {
        $set: {
          status: {
            $cond: [
              { $eq: ['$status', 'SOLD_OUT'] },
              'ACTIVE',
              '$status',
            ],
          },
          closedAt: {
            $cond: [
              { $eq: ['$status', 'SOLD_OUT'] },
              null,
              '$closedAt',
            ],
          },
        },
      },
    ],
    { new: true, session, updatePipeline: true },
  ).lean<ListingDocument>();
}

export {
  decrementStockAtomically,
  decrementStockForReserveAtomically,
  restoreStockAtomically,
};
