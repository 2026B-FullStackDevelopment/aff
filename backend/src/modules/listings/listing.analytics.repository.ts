// Aggregates Donor Listing analytics directly in MongoDB.
import { Types, type PipelineStage } from 'mongoose';
import Listing from './listing.model.js';
import type { DonorAnalyticsAggregationResult } from './listing.analytics.types.js';

/**
 * Calculates a Donor's listing counts and paid, non-cancelled Order revenue
 * without loading the Donor's Listing or Order documents into application memory.
 */
async function findDonorAnalytics(
  donorId: string | Types.ObjectId,
): Promise<DonorAnalyticsAggregationResult | undefined> {
  const donorObjectId =
    typeof donorId === 'string' ? new Types.ObjectId(donorId) : donorId;

  const pipeline: PipelineStage[] = [
    { $match: { donorId: donorObjectId } },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'listingId',
        pipeline: [
          {
            $match: {
              orderStatus: { $ne: 'CANCELLED' },
              paymentStatus: 'PAID',
            },
          },
          { $group: { _id: null, revenue: { $sum: '$amount' } } },
        ],
        as: 'paidOrderSummary',
      },
    },
    {
      $set: {
        revenue: {
          $ifNull: [{ $arrayElemAt: ['$paidOrderSummary.revenue', 0] }, 0],
        },
      },
    },
    { $project: { paidOrderSummary: 0 } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$revenue' },
              totalListings: { $sum: 1 },
              currentListings: {
                $sum: {
                  $cond: [{ $in: ['$status', ['ACTIVE', 'PAUSED']] }, 1, 0],
                },
              },
              soldOutListings: {
                $sum: { $cond: [{ $eq: ['$status', 'SOLD_OUT'] }, 1, 0] },
              },
            },
          },
          { $project: { _id: 0 } },
        ],
        categories: [
          {
            $group: {
              _id: '$category',
              listingCount: { $sum: 1 },
              revenue: { $sum: '$revenue' },
            },
          },
        ],
        topListings: [
          { $sort: { revenue: -1, createdAt: -1, _id: 1 } },
          { $limit: 5 },
          { $project: { _id: 1, name: 1, revenue: 1 } },
        ],
      },
    },
  ];

  const [result] =
    await Listing.aggregate<DonorAnalyticsAggregationResult>(pipeline);

  return result;
}

export { findDonorAnalytics };
