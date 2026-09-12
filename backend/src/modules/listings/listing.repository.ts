// Contains listing database queries so services do not call Mongoose directly.
import Listing, {
  type ListingDocument,
  type MeasurementUnit,
  type FoodCategory,
  type ListingStatus,
} from './listing.model.js';
import mongoose, {
  Types,
  type ClientSession,
  type PipelineStage,
} from 'mongoose';
import type { MineListingsQuery, ListingsQuery } from './listing.schemas.js';

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

// a listing returned by the aggregation with calculated statistics
type ListingWithStatsRecord = ListingDocument & { donatedQuantity: number; revenue: number; };

// paginated result returned to Listings serrvice
interface MyListingsRepositoryResult {
  items: ListingWithStatsRecord[];
  page: number;
  limit: number;
  total: number;
}

// internal shape retuned by MongoDB 
interface MyListingsAggregationResult {
  items: ListingWithStatsRecord[];
  metadata: Array<{ total: number; }>;
}

// ensures user search text is treated as normal text
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// paginated result returned to the Listings service for the public browse endpoint
interface AvailableListingsRepositoryResult {
  items: ListingDocument[];
  page: number;
  limit: number;
  total: number;
}

// internal shape returned by MongoDB for the public browse aggregation
interface AvailableListingsAggregationResult {
  items: ListingDocument[];
  metadata: Array<{ total: number; }>;
}

interface AdminListingFilter {
  page: number;
  limit: number;
  hasSearch: boolean;
  donorIds?: string[];
  listingId?: string;
}

interface AdminListingsRepositoryResult {
  items: ListingDocument[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Returns every Listing status for Admin oversight. Search resolution for
 * Donor names stays in the Users module; this repository receives only the
 * matching ids and applies pagination to the Listing collection.
 */
async function findListingsForAdmin(
  filter: AdminListingFilter,
): Promise<AdminListingsRepositoryResult> {
  const match: Record<string, unknown> = {};

  if (filter.hasSearch) {
    const matches: Record<string, unknown>[] = [];

    if (filter.listingId) {
      matches.push({ _id: new Types.ObjectId(filter.listingId) });
    }
    if (filter.donorIds?.length) {
      matches.push({
        donorId: { $in: filter.donorIds.map((id) => new Types.ObjectId(id)) },
      });
    }

    match.$or = matches.length > 0 ? matches : [{ _id: { $in: [] } }];
  }

  const skip = (filter.page - 1) * filter.limit;
  const [result] = await Listing.aggregate<AvailableListingsAggregationResult>([
    { $match: match },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: filter.limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ]);

  return {
    items: result?.items ?? [],
    page: filter.page,
    limit: filter.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

/**
 * Returns a page of publicly-browsable Listings, always scoped to
 * `status: 'ACTIVE'`. Supports D6's optional search/city/category/price
 * filters and price sort, mirroring `findMyListingsWithStats`'s pattern.
 */
async function findAvailableListings(
  query: ListingsQuery,
): Promise<AvailableListingsRepositoryResult> {
  const match: Record<string, unknown> = {
    status: 'ACTIVE',
  };

  // Add a case-insensitive partial-name search when supplied.
  if (query.search) {
    match.name = {
      $regex: escapeRegExp(query.search),
      $options: 'i',
    };
  }

  // City is an exact match — it's copied from the Donor's fixed-dropdown
  // profile city at listing-creation time, not free text.
  if (query.city) {
    match.city = query.city;
  }

  // Add an exact category filter when supplied.
  if (query.category) {
    match.category = query.category;
  }

  // Build the price-range filter.
  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    const price: {
      $gte?: number;
      $lte?: number;
    } = {};

    if (query.priceMin !== undefined) {
      price.$gte = query.priceMin;
    }

    if (query.priceMax !== undefined) {
      price.$lte = query.priceMax;
    }

    match.price = price;
  }

  // `order` only takes effect when a sortable field is actually requested —
  // a stray `order` with no `sort` must not flip the default browse away
  // from `createdAt desc`.
  const sortField = query.sort === 'price' ? 'price' : 'createdAt';
  const sortDirection: 1 | -1 =
    query.sort === 'price' && query.order === 'asc' ? 1 : -1;

  // _id provides stable ordering when two Listings share the same sort
  // field value.
  const sort: Record<string, 1 | -1> = {
    [sortField]: sortDirection,
    _id: 1,
  };

  const skip = (query.page - 1) * query.limit;

  const pipeline: PipelineStage[] = [
    {
      $match: match,
    },

    // Sort before pagination so that the correct page is selected.
    {
      $sort: sort,
    },

    // Return the requested page and the total count in one database query.
    {
      $facet: {
        items: [
          {
            $skip: skip,
          },
          {
            $limit: query.limit,
          },
        ],
        metadata: [
          {
            $count: 'total',
          },
        ],
      },
    },
  ];

  const [result] =
    await Listing.aggregate<AvailableListingsAggregationResult>(
      pipeline,
    );

  return {
    items: result?.items ?? [],
    page: query.page,
    limit: query.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

async function findMyListingsWithStats(
  donorId: string | Types.ObjectId, 
  query: MineListingsQuery,
): Promise<MyListingsRepositoryResult> {
  // Change ACTIVE / PAST UI Groups to actual listing statuses
  const statuses = query.status === 'ACTIVE'? ['ACTIVE', 'PAUSED'] : ['CANCELLED', 'SOLD_OUT'];
  // MongoDB aggregation does not automatically convert strings to ObjectIds.
  const donorObjectId =
    typeof donorId === 'string'
      ? new Types.ObjectId(donorId)
      : donorId;

  // Every query is always restricted to the authenticated Donor.
  const match: Record<string, unknown> = {
    donorId: donorObjectId,
    status: {
      $in: statuses,
    },
  };

  // Add a case-insensitive partial-name search when supplied.
  if (query.search) {
    match.name = {
      $regex: escapeRegExp(query.search),
      $options: 'i',
    };
  }

  // Add an exact category filter when supplied.
  if (query.category) {
    match.category = query.category;
  }

  // Build the createdAt date-range filter.
  if (query.from || query.to) {
    const createdAt: {
      $gte?: Date;
      $lte?: Date;
    } = {};

    if (query.from) {
      createdAt.$gte = new Date(query.from);
    }

    if (query.to) {
      const toDate = new Date(query.to);

      // If only a date was supplied, include the entire final day.
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }

      createdAt.$lte = toDate;
    }

    match.createdAt = createdAt;
  }

  const sortField = query.sort ?? 'createdAt';
  const sortDirection: 1 | -1 =
    query.order === 'asc' ? 1 : -1;

  // _id provides stable ordering when two Listings have the same
  // createdAt or revenue value.
  const sort: Record<string, 1 | -1> = {
    [sortField]: sortDirection,
    _id: 1,
  };

  const skip = (query.page - 1) * query.limit;

  const pipeline: PipelineStage[] = [
    // First, select only this Donor's Listings that match the filters.
    {
      $match: match,
    },

    // Join each Listing with its non-cancelled Orders.
    //
    // Mongoose's default collection name for the Order model is "orders".
    {
      $lookup: {
        from: 'orders',
        let: {
          currentListingId: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  '$listingId',
                  '$$currentListingId',
                ],
              },
            },
          },
          {
            $match: {
              orderStatus: {
                $ne: 'CANCELLED',
              },
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

    // Calculate donatedQuantity and revenue for each Listing.
    {
      $addFields: {
        // All non-cancelled Orders count toward donated quantity.
        donatedQuantity: {
          $sum: '$eligibleOrders.quantity',
        },

        // Only paid Orders count as completed revenue.
        revenue: {
          $sum: {
            $map: {
              input: '$eligibleOrders',
              as: 'order',
              in: {
                $cond: [
                  {
                    $eq: [
                      '$$order.paymentStatus',
                      'PAID',
                    ],
                  },
                  '$$order.amount',
                  0,
                ],
              },
            },
          },
        },
      },
    },

    // The joined Order array is only needed for the calculations.
    // Do not return it to the service or frontend.
    {
      $project: {
        eligibleOrders: 0,
      },
    },

    // Sort before pagination so that the correct page is selected.
    {
      $sort: sort,
    },

    // Return the requested page and the total count in one database query.
    {
      $facet: {
        items: [
          {
            $skip: skip,
          },
          {
            $limit: query.limit,
          },
        ],
        metadata: [
          {
            $count: 'total',
          },
        ],
      },
    },
  ];

  const [result] =
    await Listing.aggregate<MyListingsAggregationResult>(
      pipeline,
    );

  return {
    items: result?.items ?? [],
    page: query.page,
    limit: query.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

function createListing(data: CreateListingInput) {
  return Listing.create(data);
}

function findListingById(
  id: string | Types.ObjectId,
  session?: ClientSession,
) {
  const query = Listing.findById(id);
  return (session ? query.session(session) : query).lean<ListingDocument>();
}

/**
 * Loads a set of Listings by id, projecting the Donor reference and the
 * listing name. Used to resolve Donor/listing summaries for a page of
 * Deliveries (E2) without a per-row lookup.
 */
function findListingsByIds(listingIds: string[]) {
  if (listingIds.length === 0) return Promise.resolve([]);

  return Listing.find(
    { _id: { $in: listingIds } },
    { _id: 1, donorId: 1, name: 1 },
  ).lean<Array<{ _id: Types.ObjectId; donorId: Types.ObjectId; name: string }>>();
}

function updateListing(id: string | Types.ObjectId, data: Partial<CreateListingInput>) {
  return Listing.findByIdAndUpdate(id, data, { new: true }).lean<ListingDocument>();
}

interface UpdateListingStatusOptions {
  session?: ClientSession;
  closedAt?: Date;
}

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

/**
 * Decrements stock only while the Listing is active and has enough quantity.
 * The same atomic update changes the Listing to SOLD_OUT when stock reaches 0.
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
    // Mongoose 9 requires this explicit opt-in before it will accept an
    // array (aggregation pipeline) as an update document — otherwise it
    // throws "Cannot pass an array to query updates unless the
    // `updatePipeline` option is set" instead of running the update.
    { new: true, session, updatePipeline: true },
  ).lean<ListingDocument>();
}

/**
 * Same atomic guard/decrement as `decrementStockAtomically`, but without the
 * `donorId` filter — a Recipient reserving a listing doesn't own it.
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
    // See the matching comment in `decrementStockAtomically` above.
    { new: true, session, updatePipeline: true },
  ).lean<ListingDocument>();
}

/**
 * Restores stock on a cancelled Order's Listing (D4) — the literal inverse
 * of `decrementStockForReserveAtomically`: `$add` instead of `$subtract`,
 * and flips `SOLD_OUT` back to `ACTIVE` (clearing `closedAt`) only when the
 * Listing was `SOLD_OUT`; a `PAUSED`/`CANCELLED` Listing's status is left
 * untouched, only its count restored. No `donorId` filter (a Recipient
 * cancelling an order doesn't own the Listing) and no stock-floor guard
 * needed, since this only ever adds.
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

async function withTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    let result!: T;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export {
  findListingsForAdmin,
  findAvailableListings,
  findMyListingsWithStats,
  createListing,
  findListingById,
  findListingsByIds,
  updateListing,
  updateListingStatusIfCurrent,
  decrementStockAtomically,
  decrementStockForReserveAtomically,
  restoreStockAtomically,
  withTransaction,
};
export type { AdminListingFilter, AdminListingsRepositoryResult };
