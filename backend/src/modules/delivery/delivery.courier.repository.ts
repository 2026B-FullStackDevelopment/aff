// Contains the Courier Delivery state-machine writes (claim/pickup/locate/deliver) and the shared transaction helper.
import Delivery from './delivery.model.js';
import type { DeliveryDocument } from './delivery.types.js';
import mongoose, { type ClientSession, type Types } from 'mongoose';

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
  claimIfAvailable,
  markPickedUpIfAssigned,
  recordCourierLocation,
  markDeliveredIfPickedUp,
  withTransaction,
};
