// Contains order database queries so services do not call Mongoose directly.
import Order from './order.model.js';
import type { OrderDocument, PaymentMethod } from './order.types.js';
import mongoose, {
  Types,
  type ClientSession,
  type PipelineStage,
} from 'mongoose';
import type {
  AggregatedListingOrder, AggregatedRecipientOrder, CreateOrderInput,
  ListingOrderRepositoryItem, ListingOrdersAggregationResult, ListingOrdersRepositoryResult,
  CancellationOrderSummary, OrderJoinSummary, RecipientOrdersAggregationResult, RecipientOrderRepositoryItem,
  RecipientOrdersRepositoryResult,
} from './order.types.js';

function findOrderById(
  orderId: string | Types.ObjectId,
  session?: ClientSession,
) {
  const query = Order.findById(orderId);
  return (session ? query.session(session) : query).lean<OrderDocument>();
}

// Runs inside the caller's transaction when a session is passed; otherwise a plain write.
async function createOrder(data: CreateOrderInput, session?: ClientSession, ) {
  if (!session) { return Order.create(data); }
  // Mongoose form Model.create([data], { session });
  const [order] = await Order.create([data], {session});
  return order;
 
}

// update Order to paid only when Stripe is selected (cash payment usually made later)
function markOrderPaid(orderId: string | Types.ObjectId, session?: ClientSession, ) {
  // update Order status
  return Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentMethod: 'STRIPE',
      paymentStatus: 'PAYMENT_PENDING',
      orderStatus: { $ne: 'CANCELLED' },
    },
    {
      $set: {
        paymentStatus: 'PAID',
        orderStatus: 'PREPARING',
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).lean<OrderDocument>();
}

/**
 * Completes a payable-ready Order. For cash, the same update records payment
 * receipt and its Courier audit fields.
 */
function markOrderDelivered(
  orderId: string | Types.ObjectId,
  courierId: string | Types.ObjectId,
  deliveredAt: Date,
  isCashPayment: boolean,
  session?: ClientSession,
) {
  const paymentFilter = isCashPayment
    ? {
        paymentMethod: 'CASH' as const,
        paymentStatus: 'PAYMENT_PENDING' as const,
      }
    : {
        paymentMethod: { $ne: 'CASH' as const },
        paymentStatus: { $in: ['FREE', 'PAID'] as const },
      };

  return Order.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: 'PREPARING',
      ...paymentFilter,
    },
    {
      $set: {
        orderStatus: 'DELIVERED',
        ...(isCashPayment && {
          paymentStatus: 'PAID',
          cashConfirmedByCourierId: courierId,
          cashConfirmedAt: deliveredAt,
        }),
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).lean<OrderDocument>();
}

function findOrderByIdAndRecipient(
  orderId: string | Types.ObjectId, 
  recipientId: string | Types.ObjectId,
  session?: ClientSession,
) {
  const query = Order.findOne({
    _id: orderId,
    recipientId,
  });

  return (session ? query.session(session) : query).lean<OrderDocument>();
}

function setPaymentMethodIfUnset(
  orderId: string | Types.ObjectId,
  recipientId: string | Types.ObjectId,
  paymentMethod: PaymentMethod,
  session?: ClientSession,
) {
  return Order.findOneAndUpdate(
    {
      _id: orderId,
      recipientId,
      paymentStatus: 'PAYMENT_PENDING',
      paymentMethod: { $exists: false },
    },
    {
      $set: {
        paymentMethod,
        orderStatus: paymentMethod === 'CASH' ? 'PREPARING' : 'PENDING_PAYMENT',
      },
    },
    { new: true, runValidators: true, session },
  ).lean<OrderDocument>();
}

async function findNonCancelledOrderIdsByListing(
  listingId: string | Types.ObjectId,
  session?: ClientSession,
): Promise<string[]> {
  const query = Order.find({
    listingId,
    orderStatus: { $nin: ['CANCELLED', 'DELIVERED'] },
  }).select({ _id: 1 });

  const orders = await (session ? query.session(session) : query)
    .lean<Array<{ _id: Types.ObjectId }>>();

  return orders.map((order) => String(order._id));
}

/**
 * Whether this Recipient already has a non-cancelled Order against this
 * Listing — used to enforce "one reservation per listing per Recipient".
 */
async function hasNonCancelledOrderForListing(
  listingId: string | Types.ObjectId,
  recipientId: string | Types.ObjectId,
  session?: ClientSession,
): Promise<boolean> {
  const query = Order.exists({
    listingId,
    recipientId,
    orderStatus: { $ne: 'CANCELLED' },
  });

  const result = await (session ? query.session(session) : query);
  return Boolean(result);
}

/**
 * Loads a set of Orders by id, projecting only what a caller joining against
 * Orders needs: the Admin Delivery table (E11) uses `recipientId`, and the
 * Courier queue (E2) uses `quantity`, `deliveryAddressText`, `listingId` and
 * `amount`.
 */
async function findOrdersByIds(
  orderIds: string[],
  session?: ClientSession,
): Promise<OrderJoinSummary[]> {
  if (orderIds.length === 0) return [];

  const query = Order.find(
    { _id: { $in: orderIds } },
    {
      _id: 1,
      recipientId: 1,
      quantity: 1,
      deliveryAddressText: 1,
      deliveryLocation: 1,
      paymentMethod: 1,
      paymentStatus: 1,
      listingId: 1,
      amount: 1,
    },
  );

  return (session ? query.session(session) : query).lean<OrderJoinSummary[]>();
}

/** Loads active Orders for several Listings in one query. */
async function findNonCancelledOrdersByListingIds(
  listingIds: string[],
  session?: ClientSession,
): Promise<CancellationOrderSummary[]> {
  if (listingIds.length === 0) return [];

  const query = Order.find(
    {
      listingId: { $in: listingIds },
      orderStatus: { $nin: ['CANCELLED', 'DELIVERED'] },
    },
    { _id: 1, recipientId: 1, listingId: 1 },
  );

  return (session ? query.session(session) : query)
    .lean<CancellationOrderSummary[]>();
}

async function cancelOrdersByIds(
  orderIds: string[],
  cancelledByUserId: string | Types.ObjectId,
  cancelledAt: Date,
  session?: ClientSession,
): Promise<number> {
  if (orderIds.length === 0) return 0;

  const result = await Order.updateMany(
    {
      _id: { $in: orderIds },
      orderStatus: { $nin: ['CANCELLED', 'DELIVERED'] },
    },
    {
      $set: {
        orderStatus: 'CANCELLED',
        cancelledByUserId,
        cancelledAt,
      },
    },
    { session },
  );

  return result.modifiedCount;
}

/**
 * Atomically cancels a single Order, guarded against double-cancellation.
 * Returns `null` if the Order was already `CANCELLED` (a race with another
 * cancellation attempt).
 */
function cancelOrderById(
  orderId: string | Types.ObjectId,
  cancelledByUserId: string | Types.ObjectId,
  cancelledAt: Date,
  session?: ClientSession,
) {
  return Order.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: { $nin: ['CANCELLED', 'DELIVERED'] },
    },
    {
      $set: {
        orderStatus: 'CANCELLED',
        cancelledByUserId,
        cancelledAt,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).lean<OrderDocument>();
}

/**
 * Flips a cancelled Order's `paymentStatus` from `PAID` to `REFUND_PENDING` once a Stripe
 * refund has actually been created for it (D4); guarded, so calling it twice is a safe no-op.
 */
function markOrderRefundPending(
  orderId: string | Types.ObjectId,
  session?: ClientSession,
) {
  return Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentStatus: 'PAID',
    },
    {
      $set: {
        paymentStatus: 'REFUND_PENDING',
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).lean<OrderDocument>();
}

/**
 * Flips a cancelled Order's `paymentStatus` from `REFUND_PENDING` to
 * `REFUNDED` once the `refund.updated` webhook confirms the refund (D4).
 * Mirrors `markOrderPaid`'s exact guard-then-set shape.
 */
function markOrderRefunded(
  orderId: string | Types.ObjectId,
  session?: ClientSession,
) {
  return Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentStatus: 'REFUND_PENDING',
    },
    {
      $set: {
        paymentStatus: 'REFUNDED',
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).lean<OrderDocument>();
}

/**
 * Atomically records a Recipient's one-shot feedback on a delivered Order (D7), guarded on
 * `orderStatus: 'DELIVERED'` and no existing `feedback` so it never overwrites a race.
 */
function setFeedback(
  orderId: string | Types.ObjectId,
  comment: string,
  createdAt: Date,
  session?: ClientSession,
) {
  return Order.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: 'DELIVERED',
      feedback: { $exists: false },
    },
    {
      $set: {
        feedback: { comment, createdAt },
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).lean<OrderDocument>();
}

/** Runs related Order-domain writes in one MongoDB transaction. */
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

async function findOrdersForListing(
  listingId: string | Types.ObjectId,
  page: number,
  limit: number,
): Promise<ListingOrdersRepositoryResult> {
  const listingObjectId =
    typeof listingId === 'string'
      ? new Types.ObjectId(listingId)
      : listingId;
  const skip = (page - 1) * limit;

  const pipeline: PipelineStage[] = [
    { $match: { listingId: listingObjectId } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'recipientId',
              foreignField: '_id',
              as: 'recipientUser',
            },
          },
          { $unwind: '$recipientUser' },
          {
            $set: {
              recipient: {
                id: { $toString: '$recipientUser._id' },
                username: '$recipientUser.username',
              },
            },
          },
          { $project: { recipientUser: 0 } },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] =
    await Order.aggregate<ListingOrdersAggregationResult>(pipeline);

  return {
    items: (result?.items ?? []).map((item) => {
      const { recipient, ...order } = item;
      return { order: order as OrderDocument, recipient };
    }),
    page,
    limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

/**
 * Paginated, Donor/Listing/Delivery-enriched view of a Recipient's own Orders (D5), joining
 * each Order to its Listing, that Listing's Donor, and its Delivery stage (if any) in one aggregation.
 */
async function findOrdersForRecipient(
  recipientId: string | Types.ObjectId,
  page: number,
  limit: number,
): Promise<RecipientOrdersRepositoryResult> {
  const recipientObjectId =
    typeof recipientId === 'string'
      ? new Types.ObjectId(recipientId)
      : recipientId;
  const skip = (page - 1) * limit;

  const pipeline: PipelineStage[] = [
    { $match: { recipientId: recipientObjectId } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'listings',
              localField: 'listingId',
              foreignField: '_id',
              as: 'listingDoc',
            },
          },
          { $unwind: '$listingDoc' },
          {
            $lookup: {
              from: 'donors',
              localField: 'listingDoc.donorId',
              foreignField: 'userId',
              as: 'donorDoc',
            },
          },
          { $unwind: '$donorDoc' },
          {
            $lookup: {
              from: 'deliveries',
              localField: '_id',
              foreignField: 'orderId',
              as: 'deliveryDoc',
            },
          },
          {
            $set: {
              listing: {
                id: { $toString: '$listingDoc._id' },
                name: '$listingDoc.name',
                imageUrl: '$listingDoc.imageUrl',
                unit: '$listingDoc.unit',
                category: '$listingDoc.category',
              },
              donor: {
                id: { $toString: '$donorDoc.userId' },
                companyName: '$donorDoc.companyName',
              },
              deliveryStage: {
                $ifNull: [{ $arrayElemAt: ['$deliveryDoc.stage', 0] }, null],
              },
            },
          },
          { $project: { listingDoc: 0, donorDoc: 0, deliveryDoc: 0 } },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] =
    await Order.aggregate<RecipientOrdersAggregationResult>(pipeline);

  return {
    items: (result?.items ?? []).map((item) => {
      const { listing, donor, deliveryStage, ...order } = item;
      return { order: order as OrderDocument, listing, donor, deliveryStage };
    }),
    page,
    limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

export {
  findOrdersByIds,
  findNonCancelledOrdersByListingIds,
  findOrderById,
  findOrderByIdAndRecipient,
  createOrder,
  markOrderPaid,
  markOrderDelivered,
  setPaymentMethodIfUnset,
  findNonCancelledOrderIdsByListing,
  hasNonCancelledOrderForListing,
  cancelOrdersByIds,
  cancelOrderById,
  markOrderRefundPending,
  markOrderRefunded,
  setFeedback,
  withTransaction,
  findOrdersForListing,
  findOrdersForRecipient,
};

export type {
  CreateOrderInput, OrderJoinSummary, ListingOrderRepositoryItem,
  ListingOrdersRepositoryResult, RecipientOrderRepositoryItem,
  RecipientOrdersRepositoryResult,
} from './order.types.js';
