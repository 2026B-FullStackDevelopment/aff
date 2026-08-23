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
import type { MineListingsQuery } from './listing.schemas.js';

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

function findAvailableListings(filters: Record<string, unknown> = {}) {
  return Listing.find({ ...filters, status: 'ACTIVE' }).lean<ListingDocument[]>();
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
  findAvailableListings,
  findMyListingsWithStats,
  createListing,
  findListingById,
  updateListing,
  updateListingStatusIfCurrent,
  withTransaction,
};
