// Contains Courier Delivery business rules. See docs/api_design.md section 9.
import type { ClientSession } from 'mongoose';
import type { DeliveryDocument } from './delivery.model.js';
import * as deliveryRepository from './delivery.repository.js';
import { orderInterface } from '../orders/order.interface.js';
import { listingInterface } from '../listings/listing.interface.js';
import type {
  AdminDeliveryFilter,
  AdminDeliveryPage,
} from './delivery.repository.js';
import type { MarkDeliveredPayload } from './delivery.schemas.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

interface MarkDeliveredResult {
  delivery: DeliveryDocument;
  pickupAddressText: string | undefined;
  pickupAddressLocation: GeoLocation | undefined;
}

function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

async function createForOrder(
  orderId: string,
  session?: ClientSession,
): Promise<DeliveryDocument> {
  try {
    const delivery = await deliveryRepository.findOrCreateForOrder(orderId, session);
    if (delivery) return delivery;
  } catch (error) {
    // If a concurrent request inserted first, the unique index wins and the
    // existing Delivery is the correct idempotent result.
    if (isDuplicateKeyError(error)) {
      const existing = await deliveryRepository.findDeliveryByOrderId(orderId, session);
      if (existing) return existing;
    }

    throw error;
  }

  const error: Error = new Error('Delivery could not be created.');
  error.statusCode = 500;
  throw error;
}

async function findProtectedOrderIds(
  orderIds: string[],
  session?: ClientSession,
): Promise<string[]> {
  return deliveryRepository.findProtectedOrderIds(orderIds, session);
}

async function cancelAwaitingDeliveriesByOrderIds(
  orderIds: string[],
  cancelledAt: Date,
  session?: ClientSession,
): Promise<number> {
  return deliveryRepository.cancelAwaitingDeliveriesByOrderIds(
    orderIds,
    cancelledAt,
    session,
  );
}

/** Looks up the Delivery for a single Order, if one exists yet (D4). */
async function findByOrderId(
  orderId: string,
  session?: ClientSession,
) {
  return deliveryRepository.findDeliveryByOrderId(orderId, session);
}

/**
 * Atomically cancels a single Order's Delivery as part of the Recipient's
 * own cancellation (D4). Returns `null` if the stage already moved past
 * `AWAITING_COURIER` — the caller treats that as a claim-race 409.
 */
async function cancelAwaitingDeliveryForOrder(
  orderId: string,
  cancelledAt: Date,
  session?: ClientSession,
) {
  return deliveryRepository.cancelAwaitingDeliveryForOrder(
    orderId,
    cancelledAt,
    session,
  );
}

/**
 * Reads one page of every Delivery for the Admin oversight table (E11).
 * Read-only by design: the Admin module has no way to assign, reassign, or
 * force-claim a Delivery, and this module exposes no operation that would
 * let it (`docs/api_design.md` §11).
 */
async function listForAdmin(filter: AdminDeliveryFilter): Promise<AdminDeliveryPage> {
  return deliveryRepository.listForAdmin(filter);
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
): Promise<MarkDeliveredResult> {
  return deliveryRepository.withTransaction(
    async (databaseSession) => {
      const delivery = await deliveryRepository.findDeliveryById(
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

      const isCashPayment = order.paymentMethod === 'CASH';

      if (isCashPayment && payload.cashConfirmed !== true) {
        throw createHttpError(
          400,
          'Cash confirmation is required.',
        );
      }

      const deliveredAt = new Date();
      const updatedDelivery =
        await deliveryRepository.markDeliveredIfPickedUp(
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

      const listingSource = await listingInterface.getListingById(
        String(order.listingId),
      );

      return {
        delivery: updatedDelivery,
        pickupAddressText: listingSource?.donor.addressText,
        pickupAddressLocation: listingSource?.donor.location,
      };
    },
  );
}

export {
  createForOrder,
  findProtectedOrderIds,
  cancelAwaitingDeliveriesByOrderIds,
  findByOrderId,
  cancelAwaitingDeliveryForOrder,
  listForAdmin,
  markDelivered,
};
