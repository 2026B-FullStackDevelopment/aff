// Contains Delivery database operations so services do not call Mongoose directly.
import Delivery from './delivery.model.js';
import type { DeliveryDocument, DeliveryStage } from './delivery.types.js';
import mongoose, {
  type ClientSession,
  type PipelineStage,
  type Types,
} from 'mongoose';
import type { AdminDeliveryFilter, DeliveryAggregationResult, DeliveryPage, QueueFilter } from './delivery.types.js';

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

/**
 * Atomically claims the one-way `ASSIGNED` to `PICKED_UP` transition (E6).
 *
 * `courierId` is part of the filter, so another Courier's Delivery is
 * indistinguishable from a wrong-stage one — neither is actionable by this
 * caller. The row stays inside the partial unique index on `courierId` across
 * this transition, so the Courier keeps holding their one active slot.
 */
function markPickedUpIfAssigned(
  deliveryId: string | Types.ObjectId,
  courierId: string | Types.ObjectId,
  pickedUpAt: Date,
) {
  return Delivery.findOneAndUpdate(
    { _id: deliveryId, courierId, stage: 'ASSIGNED' },
    { $set: { stage: 'PICKED_UP', pickedUpAt } },
    { new: true, runValidators: true },
  ).lean<DeliveryDocument>();
}

/**
 * Records a Courier's latest position on whichever Delivery they are currently
 * carrying (E6/E9).
 *
 * The Delivery is derived from `courierId` rather than supplied by the caller,
 * so a Courier can only ever write to their own picked-up Delivery — there is
 * no id to forge. One operation performs the ownership check, the stage check,
 * the write, and the `orderId` lookup the caller needs to address its emit.
 *
 * @returns The updated Delivery, or `null` if this Courier has none in
 *   `PICKED_UP` — which is the normal case for a stale client still pinging.
 */
function recordCourierLocation(
  courierId: string | Types.ObjectId,
  position: { latitude: number; longitude: number },
) {
  return Delivery.findOneAndUpdate(
    { courierId, stage: 'PICKED_UP' },
    {
      $set: {
        courierLastLocation: {
          latitude: position.latitude,
          longitude: position.longitude,
          // The client sends coordinates only; the server owns the timestamp.
          updatedAt: new Date(),
        },
      },
    },
    { new: true },
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

/**
 * Reads one page of Deliveries for the Admin oversight table. Returns only
 * Delivery-owned fields — the Courier's name and the Order's recipient are
 * hydrated by the caller through their own modules' interfaces, so this
 * module never reads another module's collection.
 */
async function listForAdmin(filter: AdminDeliveryFilter): Promise<DeliveryPage> {
  const match: Record<string, unknown> = {};

  if (filter.stage) {
    match.stage = filter.stage;
  }

  const skip = (filter.page - 1) * filter.limit;

  const pipeline: PipelineStage[] = [
    { $match: match },

    // Newest first: an oversight table is read for current activity, not
    // history. `_id` breaks ties so paging stays stable.
    { $sort: { createdAt: -1, _id: -1 } },

    // One round trip for both the page and the total behind it.
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: filter.limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] = await Delivery.aggregate<DeliveryAggregationResult>(pipeline);

  return {
    items: result?.items ?? [],
    page: filter.page,
    limit: filter.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

/**
 * Atomically claims a Delivery for a Courier (E3).
 *
 * One conditional write, never a read-then-write. The `stage` filter closes
 * the double-claim race and, by the same mechanism, D4's cancellation cutoff:
 * if a Recipient cancelled at the same instant, the stage moved and this claim
 * loses. The unique partial index on `courierId` closes the second race — a
 * Courier who already holds an ASSIGNED/PICKED_UP Delivery gets a
 * duplicate-key error instead of a second job.
 *
 * @returns The claimed Delivery, or `null` if it was no longer available.
 * @throws A MongoDB duplicate-key error (11000) if this Courier already has an
 *   active Delivery. The service translates it into a 409.
 */
function claimIfAvailable(
  deliveryId: string | Types.ObjectId,
  courierId: string | Types.ObjectId,
) {
  return Delivery.findOneAndUpdate(
    { _id: deliveryId, stage: 'AWAITING_COURIER' },
    { $set: { stage: 'ASSIGNED', courierId } },
    { new: true, runValidators: true },
  ).lean<DeliveryDocument>();
}

/**
 * Finds the Courier's one in-flight Delivery (E4). Uses the same predicate as
 * the unique partial index that enforces the rule, so the definition of
 * "active" cannot drift between the constraint and the query.
 */
function findActiveByCourier(courierId: string | Types.ObjectId) {
  return Delivery.findOne({
    courierId,
    stage: { $in: ['ASSIGNED', 'PICKED_UP'] },
  }).lean<DeliveryDocument>();
}

/**
 * Reads one page of the shared, oldest-first Courier queue.
 *
 * Ordering is by `DELIVERY.createdAt` — the moment the Order became
 * claimable — not `ORDER.createdAt`. See D1 in
 * docs/superpowers/specs/2026-08-30-courier-core-backend-design.md.
 * The sort is fixed here rather than accepted from the client so no Courier
 * can work the queue out of turn.
 */
async function findQueue(filter: QueueFilter): Promise<DeliveryPage> {
  const skip = (filter.page - 1) * filter.limit;

  const pipeline: PipelineStage[] = [
    { $match: { stage: 'AWAITING_COURIER' } },

    // `_id` breaks ties so paging stays stable when two Deliveries share a
    // millisecond.
    { $sort: { createdAt: 1, _id: 1 } },

    {
      $facet: {
        items: [{ $skip: skip }, { $limit: filter.limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] = await Delivery.aggregate<DeliveryAggregationResult>(pipeline);

  return {
    items: result?.items ?? [],
    page: filter.page,
    limit: filter.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
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
  markPickedUpIfAssigned,
  recordCourierLocation,
  markDeliveredIfPickedUp,
  listForAdmin,
  findQueue,
  claimIfAvailable,
  findActiveByCourier,
  withTransaction,
};
export type { AdminDeliveryFilter, DeliveryPage, QueueFilter } from './delivery.types.js';
