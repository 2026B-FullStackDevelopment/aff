// Contains Courier Delivery business rules. See docs/api_design.md section 9.
import type { ClientSession } from 'mongoose';
import type { DeliveryDocument } from './delivery.model.js';
import * as deliveryRepository from './delivery.repository.js';
import { orderInterface } from '../orders/order.interface.js';
import { listingInterface } from '../listings/listing.interface.js';
import type {
  AdminDeliveryFilter,
  DeliveryPage,
} from './delivery.repository.js';
import type {
  MarkDeliveredPayload,
  DeliveryQueueQuery,
} from './delivery.schemas.js';
import { toQueueDeliveryResponseDto } from './delivery.dto.js';
import type { QueueDeliveryResponseDto } from './delivery.dto.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

/** A Delivery plus its resolved pickup address (E5). */
interface DeliveryWithPickupAddress {
  delivery: DeliveryDocument;
  pickupAddressText: string | undefined;
  pickupAddressLocation: GeoLocation | undefined;
}

/** One page of hydrated queue rows. */
interface QueueDeliveryPage {
  items: QueueDeliveryResponseDto[];
  page: number;
  limit: number;
  total: number;
}

/** Collects the distinct, defined ids in `values`, preserving first-seen order. */
function distinctIds(values: Array<unknown>): string[] {
  const ids = new Set<string>();

  for (const value of values) {
    if (value) ids.add(String(value));
  }

  return [...ids];
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
 * Reads one page of the shared Courier queue (E2), hydrated with the Order
 * and Donor fields a Courier needs to decide whether to claim.
 *
 * Hydration is two bulk calls through other modules' interfaces rather than a
 * lookup per row, so a page costs a constant number of queries regardless of
 * its size — resolving each row individually would cost three queries each.
 * The calls are sequential rather than parallel because the Listing ids come
 * from the Orders.
 */
async function listQueue(query: DeliveryQueueQuery): Promise<QueueDeliveryPage> {
  const page = await deliveryRepository.findQueue(query);

  if (page.items.length === 0) {
    return { ...page, items: [] };
  }

  const orders = await orderInterface.findOrdersByIds(
    distinctIds(page.items.map((delivery) => delivery.orderId)),
  );

  const orderById = new Map(orders.map((order) => [String(order._id), order]));

  const donorSummaries = await listingInterface.findDonorSummariesByListingIds(
    distinctIds(orders.map((order) => order.listingId)),
  );

  const companyNameByListingId = new Map(
    donorSummaries.map((summary) => [summary.listingId, summary.companyName]),
  );

  return {
    ...page,
    items: page.items.map((delivery) => {
      const order = orderById.get(String(delivery.orderId));

      return toQueueDeliveryResponseDto(delivery, {
        order: order
          ? {
              quantity: order.quantity,
              deliveryAddressText: order.deliveryAddressText,
            }
          : null,
        companyName: order
          ? companyNameByListingId.get(String(order.listingId)) ?? null
          : null,
      });
    }),
  };
}

/**
 * Reads one page of every Delivery for the Admin oversight table (E11).
 * Read-only by design: the Admin module has no way to assign, reassign, or
 * force-claim a Delivery, and this module exposes no operation that would
 * let it (`docs/api_design.md` §11).
 */
async function listForAdmin(filter: AdminDeliveryFilter): Promise<DeliveryPage> {
  return deliveryRepository.listForAdmin(filter);
}

/**
 * Resolves a Delivery's pickup address from its Order's Listing (E5).
 *
 * Both fields are denormalised from the Donor at read time. A Listing that
 * cannot be loaded yields `undefined` for both rather than failing the
 * request — the Courier still gets their Delivery, just without a map pin.
 */
async function resolvePickupAddress(listingId: string): Promise<{
  pickupAddressText: string | undefined;
  pickupAddressLocation: GeoLocation | undefined;
}> {
  const listingSource = await listingInterface.getListingById(listingId);

  return {
    pickupAddressText: listingSource?.donor.addressText,
    pickupAddressLocation: listingSource?.donor.location,
  };
}

/** Loads a Delivery's Order and resolves its pickup address in one step. */
async function withPickupAddress(
  delivery: DeliveryDocument,
): Promise<DeliveryWithPickupAddress> {
  const order = await orderInterface.findOrderById(String(delivery.orderId));

  if (!order) {
    return {
      delivery,
      pickupAddressText: undefined,
      pickupAddressLocation: undefined,
    };
  }

  return { delivery, ...(await resolvePickupAddress(String(order.listingId))) };
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
    claimed = await deliveryRepository.claimIfAvailable(deliveryId, courierId);
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
    const existing = await deliveryRepository.findDeliveryById(deliveryId);

    throw existing
      ? createHttpError(409, 'This Delivery has already been claimed.')
      : createHttpError(404, 'Delivery not found.');
  }

  return withPickupAddress(claimed);
}

/**
 * Returns the Courier's one in-flight Delivery (E4). A 404 is the documented
 * signal for the client to fall through to the queue, not an error condition.
 */
async function getActiveDelivery(
  courierId: string,
): Promise<DeliveryWithPickupAddress> {
  const active = await deliveryRepository.findActiveByCourier(courierId);

  if (!active) {
    throw createHttpError(404, 'You have no active Delivery.');
  }

  return withPickupAddress(active);
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
  const updated = await deliveryRepository.markPickedUpIfAssigned(
    deliveryId,
    courierId,
    new Date(),
  );

  if (!updated) {
    throw createHttpError(409, 'Only an assigned Delivery can be picked up.');
  }

  return withPickupAddress(updated);
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

      return {
        delivery: updatedDelivery,
        ...(await resolvePickupAddress(String(order.listingId))),
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
  listQueue,
  claimDelivery,
  getActiveDelivery,
  markPickedUp,
  markDelivered,
};
export type { QueueDeliveryPage };
