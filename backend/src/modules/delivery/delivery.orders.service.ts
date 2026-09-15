// Contains Delivery operations reached only through delivery.interface.ts by the orders module.
import type { ClientSession } from 'mongoose';
import type { DeliveryDocument } from './delivery.types.js';
import * as deliveryOrdersRepository from './delivery.orders.repository.js';
import { isDuplicateKeyError } from './delivery.errors.js';

async function createForOrder(
  orderId: string,
  session?: ClientSession,
): Promise<DeliveryDocument> {
  try {
    const delivery = await deliveryOrdersRepository.findOrCreateForOrder(orderId, session);
    if (delivery) return delivery;
  } catch (error) {
    // If a concurrent request inserted first, the unique index wins and the
    // existing Delivery is the correct idempotent result.
    if (isDuplicateKeyError(error)) {
      const existing = await deliveryOrdersRepository.findDeliveryByOrderId(orderId, session);
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
  return deliveryOrdersRepository.findProtectedOrderIds(orderIds, session);
}

async function cancelAwaitingDeliveriesByOrderIds(
  orderIds: string[],
  cancelledAt: Date,
  session?: ClientSession,
): Promise<number> {
  return deliveryOrdersRepository.cancelAwaitingDeliveriesByOrderIds(
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
  return deliveryOrdersRepository.findDeliveryByOrderId(orderId, session);
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
  return deliveryOrdersRepository.cancelAwaitingDeliveryForOrder(
    orderId,
    cancelledAt,
    session,
  );
}

export {
  createForOrder,
  findProtectedOrderIds,
  cancelAwaitingDeliveriesByOrderIds,
  findByOrderId,
  cancelAwaitingDeliveryForOrder,
};
