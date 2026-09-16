// Contains the Courier Delivery state-machine actions (claim/pickup/locate/deliver) and their realtime notifications.
import type { DeliveryDocument, DeliveryStage } from './delivery.types.js';
import * as deliveryCourierRepository from './delivery.courier.repository.js';
import * as deliveryQueueRepository from './delivery.queue.repository.js';
import { loadDeliveryContext, resolvePickupAddress } from './delivery.queue.service.js';
import { orderInterface } from '../orders/order.interface.js';
import { emitToOrder } from '../../realtime/socket.js';
import { notificationInterface } from '../notifications/notification.interface.js';
import { createHttpError, isDuplicateKeyError } from './delivery.errors.js';
import type { MarkDeliveredPayload } from './delivery.schemas.js';
import { requiresCashCollection } from './delivery.dto.js';
import type { DeliveryWithPickupAddress } from './delivery.types.js';

/**
 * Tells a Recipient their Delivery moved to a new stage (E8).
 *
 * Fires on claim, pickup and deliver only — never on cancellation. Cascade
 * cancellation is a bulk update over many orders, the Recipient's stepper has
 * no cancelled state, and cancellations reach them through
 * `notification:admin_cancel` instead. See D4 in the design doc.
 */
function emitStageChanged(orderId: string, recipientId: string, stage: DeliveryStage, persist?: boolean) {
  void notificationInterface.sendNotification({
    userId: recipientId,
    type: 'DELIVERY_STATUS',
    event: 'order:status_changed',
    orderId,
    ...(persist === false ? { persist: false } : {}),
    payload: { orderId, stage },
  });
}

/**
 * Runs a realtime notification without letting its failure reach the caller.
 *
 * Every call site here runs after its database write has already committed.
 * The emit helpers call `getSocketServer()`, which throws if Socket.IO has
 * not been initialized; letting that propagate would turn a successful write
 * into an API error, and a retry of pickup or deliver would then hit a
 * spurious 409. A missed notification is strictly better than that, so it is
 * logged and swallowed instead.
 */
function safeEmit(emit: () => void): void {
  try {
    emit();
  } catch (error) {
    console.error('Failed to emit a realtime delivery event:', error);
  }
}

/**
 * Loads a Delivery's view and tells the Recipient its stage changed — the
 * shared tail of `claimDelivery` and `markPickedUp`, which differ only in how
 * they produce the updated Delivery. See `safeEmit` for why the notification
 * can't fail the call.
 */
async function loadContextAndNotifyStageChange(
  delivery: DeliveryDocument,
): Promise<DeliveryWithPickupAddress> {
  const { view, order } = await loadDeliveryContext(delivery);

  if (order) {
    safeEmit(() =>
      emitStageChanged(String(order._id), String(order.recipientId), delivery.stage),
    );
  }

  return view;
}

/**
 * Claims an unclaimed Delivery for a Courier (E3/E4/E5).
 *
 * Both 409s are distinct on purpose: the client shows "someone beat you to it"
 * and "finish your current job first" differently, and conflating a garbage id
 * with a lost race would make a real bug look routine.
 */
async function claimDelivery(
  deliveryId: string,
  courierId: string,
): Promise<DeliveryWithPickupAddress> {
  let claimed: DeliveryDocument | null;

  try {
    claimed = await deliveryCourierRepository.claimIfAvailable(deliveryId, courierId);
  } catch (error) {
    // The only unique index this write can violate is the partial one on
    // courierId — claim never touches orderId — so 11000 means exactly one
    // thing here.
    if (isDuplicateKeyError(error)) {
      throw createHttpError(409, 'You already have an active Delivery.');
    }

    throw error;
  }

  if (!claimed) {
    // Only on the failure path: decide whether the stage moved or the id is
    // simply wrong.
    const existing = await deliveryQueueRepository.findDeliveryById(deliveryId);

    throw existing
      ? createHttpError(409, 'This Delivery has already been claimed.')
      : createHttpError(404, 'Delivery not found.');
  }

  return loadContextAndNotifyStageChange(claimed);
}

/**
 * Confirms a Courier has collected the order (E6).
 *
 * `ORDER.orderStatus` is deliberately untouched — it stays `PREPARING` through
 * claim and pickup per `docs/api_design.md` §9, and clients drive
 * delivery-progress UI from `DeliveryDTO.stage` rather than `orderStatus`.
 */
async function markPickedUp(
  deliveryId: string,
  courierId: string,
): Promise<DeliveryWithPickupAddress> {
  const updated = await deliveryCourierRepository.markPickedUpIfAssigned(
    deliveryId,
    courierId,
    new Date(),
  );

  if (!updated) {
    throw createHttpError(409, 'Only an assigned Delivery can be picked up.');
  }

  return loadContextAndNotifyStageChange(updated);
}

/**
 * Records a Courier's latest position (E6/E9). Called by the realtime layer's
 * `delivery:ping` handler, not by any HTTP route.
 */
async function recordCourierLocation(
  courierId: string,
  position: { latitude: number; longitude: number },
): Promise<DeliveryDocument | null> {
  return deliveryCourierRepository.recordCourierLocation(courierId, position);
}

/**
 * Completes a Delivery owned by the authenticated Courier. Cash Orders require
 * explicit receipt confirmation, and both Delivery and Order changes commit in
 * the same transaction.
 */
async function markDelivered(
  deliveryId: string,
  courierId: string,
  payload: MarkDeliveredPayload,
): Promise<DeliveryWithPickupAddress> {
  const { view, recipientId, orderId, deliveredAt } = await deliveryCourierRepository.withTransaction(
    async (databaseSession) => {
      const delivery = await deliveryQueueRepository.findDeliveryById(
        deliveryId,
        databaseSession,
      );

      if (!delivery) {
        throw createHttpError(404, 'Delivery not found.');
      }

      if (
        !delivery.courierId ||
        String(delivery.courierId) !== courierId
      ) {
        throw createHttpError(
          403,
          'This Delivery is not assigned to you.',
        );
      }

      if (delivery.stage !== 'PICKED_UP') {
        throw createHttpError(
          409,
          'Only a picked-up Delivery can be completed.',
        );
      }

      const order = await orderInterface.findOrderById(
        String(delivery.orderId),
        databaseSession,
      );

      if (!order) {
        throw createHttpError(404, 'Order not found.');
      }

      const isCashPayment = requiresCashCollection(order);

      if (isCashPayment && payload.cashConfirmed !== true) {
        throw createHttpError(
          400,
          'Cash confirmation is required.',
        );
      }

      const deliveredAt = new Date();
      const updatedDelivery =
        await deliveryCourierRepository.markDeliveredIfPickedUp(
          deliveryId,
          courierId,
          deliveredAt,
          databaseSession,
        );

      if (!updatedDelivery) {
        throw createHttpError(
          409,
          'The Delivery is no longer ready to be completed.',
        );
      }

      const updatedOrder = await orderInterface.markOrderDelivered(
        String(order._id),
        courierId,
        deliveredAt,
        isCashPayment,
        databaseSession,
      );

      if (!updatedOrder) {
        throw createHttpError(
          409,
          'The related Order could not be completed.',
        );
      }

      return {
        view: {
          delivery: updatedDelivery,
          ...(await resolvePickupAddress(String(order.listingId))),
          order,
        },
        recipientId: String(order.recipientId),
        orderId: String(order._id),
        deliveredAt,
      };
    },
  );

  // After the commit, never inside it: an emit from within the callback would
  // announce a delivery that a later abort rolls back, and that announcement
  // cannot be retracted. Each notification is independently guarded (see
  // `safeEmit`) so one failing to send doesn't stop the others from trying.
  safeEmit(() => emitStageChanged(orderId, recipientId, view.delivery.stage, false));
  safeEmit(() =>
    notificationInterface.sendNotification({
      userId: recipientId,
      type: 'DELIVERY_STATUS',
      event: 'delivery:delivered',
      orderId,
      payload: { orderId, deliveredAt },
    }),
  );
  safeEmit(() => emitToOrder(orderId, 'delivery:delivered', { orderId, deliveredAt }));

  return view;
}

export { claimDelivery, markPickedUp, recordCourierLocation, markDelivered };
