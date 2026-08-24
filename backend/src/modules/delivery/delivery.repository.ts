// Contains Delivery database operations so services do not call Mongoose directly.
import Delivery, { type DeliveryDocument } from './delivery.model.js';
import type { ClientSession, Types } from 'mongoose';

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

export {
  findDeliveryByOrderId,
  findOrCreateForOrder,
  findProtectedOrderIds,
  cancelAwaitingDeliveriesByOrderIds,
};
