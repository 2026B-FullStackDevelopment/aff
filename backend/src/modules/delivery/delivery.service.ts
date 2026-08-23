// Contains Courier Delivery business rules. See docs/api_design.md section 9.
import type { ClientSession } from 'mongoose';
import type { DeliveryDocument } from './delivery.model.js';
import * as deliveryRepository from './delivery.repository.js';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

async function createForOrder(orderId: string): Promise<DeliveryDocument> {
  try {
    const delivery = await deliveryRepository.findOrCreateForOrder(orderId);
    if (delivery) return delivery;
  } catch (error) {
    // If a concurrent request inserted first, the unique index wins and the
    // existing Delivery is the correct idempotent result.
    if (isDuplicateKeyError(error)) {
      const existing = await deliveryRepository.findDeliveryByOrderId(orderId);
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

export {
  createForOrder,
  findProtectedOrderIds,
  cancelAwaitingDeliveriesByOrderIds,
};
