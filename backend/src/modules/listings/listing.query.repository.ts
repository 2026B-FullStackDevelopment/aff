// Contains read-only Listing queries and pagination aggregations.
import Listing, { type ListingDocument } from './listing.model.js';
import { Types, type ClientSession, type PipelineStage } from 'mongoose';
import type { MineListingsQuery, ListingsQuery } from './listing.schemas.js';

/** A Listing returned by the Donor aggregation with calculated statistics. */
type ListingWithStatsRecord = ListingDocument & {
  donatedQuantity: number;
  revenue: number;
};

interface MyListingsRepositoryResult {
  items: ListingWithStatsRecord[];
  page: number;
  limit: number;
  total: number;
}

interface MyListingsAggregationResult {
  items: ListingWithStatsRecord[];
  metadata: Array<{ total: number }>;
}

interface AvailableListingsRepositoryResult {
  items: ListingDocument[];
  page: number;
  limit: number;
  total: number;
}

interface AvailableListingsAggregationResult {
  items: ListingDocument[];
  metadata: Array<{ total: number }>;
}

/** Escapes user input before it is embedded in a MongoDB regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns a page of publicly-browsable Listings, always scoped to
 * `status: 'ACTIVE'`. Supports D6's optional search/city/category/price
 * filters and price sort.
 */
async function findAvailableListings(
  query: ListingsQuery,
): Promise<AvailableListingsRepositoryResult> {
  const match: Record<string, unknown> = {
    status: 'ACTIVE',
  };

  if (query.search) {
    match.name = {
      $regex: escapeRegExp(query.search),
      $options: 'i',
    };
  }

  if (query.city) {
    match.city = query.city;
  }

  if (query.category) {
    match.category = query.category;
  }

  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    const price: { $gte?: number; $lte?: number } = {};

    if (query.priceMin !== undefined) {
      price.$gte = query.priceMin;
    }

    if (query.priceMax !== undefined) {
      price.$lte = query.priceMax;
    }

    match.price = price;
  }

  // `order` only applies when a sortable field is requested. A stray order
  // value must not change the default newest-first browse.
  const sortField = query.sort === 'price' ? 'price' : 'createdAt';
  const sortDirection: 1 | -1 =
    query.sort === 'price' && query.order === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = {
    [sortField]: sortDirection,
    _id: 1,
  };
  const skip = (query.page - 1) * query.limit;

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: sort },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: query.limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] =
    await Listing.aggregate<AvailableListingsAggregationResult>(pipeline);

  return {
    items: result?.items ?? [],
    page: query.page,
    limit: query.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

/** Returns one filtered page of a Donor's Listings with order statistics. */
async function findMyListingsWithStats(
  donorId: string | Types.ObjectId,
  query: MineListingsQuery,
): Promise<MyListingsRepositoryResult> {
  const statuses =
    query.status === 'ACTIVE'
      ? ['ACTIVE', 'PAUSED']
      : ['CANCELLED', 'SOLD_OUT'];
  const donorObjectId =
    typeof donorId === 'string' ? new Types.ObjectId(donorId) : donorId;

  const match: Record<string, unknown> = {
    donorId: donorObjectId,
    status: { $in: statuses },
  };

  if (query.search) {
    match.name = {
      $regex: escapeRegExp(query.search),
      $options: 'i',
    };
  }

  if (query.category) {
    match.category = query.category;
  }

  if (query.from || query.to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};

    if (query.from) {
      createdAt.$gte = new Date(query.from);
    }

    if (query.to) {
      const toDate = new Date(query.to);

      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }

      createdAt.$lte = toDate;
    }

    match.createdAt = createdAt;
  }

  const sortField = query.sort ?? 'createdAt';
  const sortDirection: 1 | -1 = query.order === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = {
    [sortField]: sortDirection,
    _id: 1,
  };
  const skip = (query.page - 1) * query.limit;

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: 'orders',
        let: { currentListingId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$listingId', '$$currentListingId'] },
            },
          },
          {
            $match: {
              orderStatus: { $ne: 'CANCELLED' },
            },
          },
          {
            $project: {
              quantity: 1,
              amount: 1,
              paymentStatus: 1,
            },
          },
        ],
        as: 'eligibleOrders',
      },
    },
    {
      $addFields: {
        donatedQuantity: { $sum: '$eligibleOrders.quantity' },
        revenue: {
          $sum: {
            $map: {
              input: '$eligibleOrders',
              as: 'order',
              in: {
                $cond: [
                  { $eq: ['$$order.paymentStatus', 'PAID'] },
                  '$$order.amount',
                  0,
                ],
              },
            },
          },
        },
      },
    },
    { $project: { eligibleOrders: 0 } },
    { $sort: sort },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: query.limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] =
    await Listing.aggregate<MyListingsAggregationResult>(pipeline);

  return {
    items: result?.items ?? [],
    page: query.page,
    limit: query.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

/** Finds one Listing and optionally joins the query to an existing session. */
function findListingById(
  id: string | Types.ObjectId,
  session?: ClientSession,
) {
  const query = Listing.findById(id);
  return (session ? query.session(session) : query).lean<ListingDocument>();
}

/** Loads Listing-to-Donor summaries in one query for cross-module joins. */
function findListingsByIds(listingIds: string[]) {
  if (listingIds.length === 0) return Promise.resolve([]);

  return Listing.find(
    { _id: { $in: listingIds } },
    { _id: 1, donorId: 1, name: 1 },
  ).lean<Array<{ _id: Types.ObjectId; donorId: Types.ObjectId; name: string }>>();
}

export {
  findAvailableListings,
  findMyListingsWithStats,
  findListingById,
  findListingsByIds,
};
export type {
  ListingWithStatsRecord,
  MyListingsRepositoryResult,
  AvailableListingsRepositoryResult,
};
