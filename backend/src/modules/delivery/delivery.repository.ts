// Contains Delivery database operations so services do not call Mongoose directly.
import Delivery, { type DeliveryDocument } from './delivery.model.js';
import mongoose, { type ClientSession, type Types } from 'mongoose';

function findDeliveryById(
  deliveryId: string | Types.ObjectId,
  session?: ClientSession,
) {
  const query = Delivery.findById(deliveryId);
  return (session ? query.session(session) : query).lean<DeliveryDocument>();
}

function findDeliveryByOrderId(
  orderId: string | Types.ObjectId,
  session?: ClientSession,
) {
  const query = Delivery.findOne({ orderId });
  return (session ? query.session(session) : query).lean<DeliveryDocument>();
}

function findOrCreateForOrder(
  orderId: string | Types.ObjectId,
  session?: ClientSession,
) {
  return Delivery.findOneAndUpdate(
    { orderId },
    {
      $setOnInsert: {
        orderId,
        stage: 'AWAITING_COURIER',
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
      session,
    },
  ).lean<DeliveryDocument>();
}

async function findProtectedOrderIds(
  orderIds: string[],
  session?: ClientSession,
): Promise<string[]> {
  if (orderIds.length === 0) return [];

  const query = Delivery.find({
    orderId: { $in: orderIds },
    stage: { $in: ['ASSIGNED', 'PICKED_UP', 'DELIVERED'] },
  }).select({ orderId: 1 });

  const deliveries = await (session ? query.session(session) : query)
    .lean<Array<{ orderId: Types.ObjectId }>>();

  return deliveries.map((delivery) => String(delivery.orderId));
}

async function cancelAwaitingDeliveriesByOrderIds(
  orderIds: string[],
  cancelledAt: Date,
  session?: ClientSession,
): Promise<number> {
  if (orderIds.length === 0) return 0;

  const result = await Delivery.updateMany(
    {
      orderId: { $in: orderIds },
      stage: 'AWAITING_COURIER',
    },
    {
      $set: {
        stage: 'CANCELLED',
        cancelledAt,
      },
    },
    { session },
  );

  return result.modifiedCount;
}

/**
 * Atomically cancels a single Delivery still awaiting a Courier, as part of
 * a Recipient's own order cancellation (D4). Returns `null` if the stage has
 * already moved past `AWAITING_COURIER` — the claim-race guard: a claim
 * racing a cancellation can never leave both operations believing they won.
 */
function cancelAwaitingDeliveryForOrder(
  orderId: string | Types.ObjectId,
  cancelledAt: Date,
  session?: ClientSession,
) {
  return Delivery.findOneAndUpdate(
    {
      orderId,
      stage: 'AWAITING_COURIER',
    },
    {
      $set: {
        stage: 'CANCELLED',
        cancelledAt,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).lean<DeliveryDocument>();
}

/** Atomically claims the one-way `PICKED_UP` to `DELIVERED` transition. */
function markDeliveredIfPickedUp(
  deliveryId: string | Types.ObjectId,
  courierId: string | Types.ObjectId,
  deliveredAt: Date,
  session?: ClientSession,
) {
  return Delivery.findOneAndUpdate(
    {
      _id: deliveryId,
      courierId,
      stage: 'PICKED_UP',
    },
    {
      $set: {
        stage: 'DELIVERED',
        deliveredAt,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).lean<DeliveryDocument>();
}

/** Runs related Delivery-domain writes in one MongoDB transaction. */
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
  findDeliveryById,
  findDeliveryByOrderId,
  findOrCreateForOrder,
  findProtectedOrderIds,
  cancelAwaitingDeliveriesByOrderIds,
  cancelAwaitingDeliveryForOrder,
  markDeliveredIfPickedUp,
  withTransaction,
};
