// Contains order database queries so services do not call Mongoose directly.
import Order, { type OrderDocument, type IntakePath, type PaymentMethod, type PaymentStatus, type OrderStatus } from './order.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';
import {
  Types,
  type ClientSession,
  type PipelineStage,
} from 'mongoose';

interface CreateOrderInput {
  recipientId: string | Types.ObjectId;
  listingId: string | Types.ObjectId;
  intakePath: IntakePath;
  quantity: number;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryAddressText: string;
  deliveryLocation: GeoLocation;
}

interface ListingOrderRepositoryItem {
  order: OrderDocument;
  recipient: {
    id: string;
    username: string;
  };
}

interface ListingOrdersRepositoryResult {
  items: ListingOrderRepositoryItem[];
  page: number;
  limit: number;
  total: number;
}

interface AggregatedListingOrder extends OrderDocument {
  recipient: {
    id: string;
    username: string;
  };
}

interface ListingOrdersAggregationResult {
  items: AggregatedListingOrder[];
  metadata: Array<{ total: number }>;
}

function findOrdersByRecipient(recipientId: string | Types.ObjectId) {
  return Order.find({ recipientId }).lean<OrderDocument[]>();
}

// MongoDB database session, session? means not mandatory
// const session = await mongoose.startSession();
// to gather multiple database operations
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
    orderStatus: { $ne: 'CANCELLED' },
  }).select({ _id: 1 });

  const orders = await (session ? query.session(session) : query)
    .lean<Array<{ _id: Types.ObjectId }>>();

  return orders.map((order) => String(order._id));
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
      orderStatus: { $ne: 'CANCELLED' },
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

export {
  findOrdersByRecipient,
  findOrderByIdAndRecipient,
  createOrder,
  markOrderPaid,
  setPaymentMethodIfUnset,
  findNonCancelledOrderIdsByListing,
  cancelOrdersByIds,
  findOrdersForListing,
};

export type {
  CreateOrderInput,
  ListingOrderRepositoryItem,
  ListingOrdersRepositoryResult,
};
