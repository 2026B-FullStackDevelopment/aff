// Contains Delivery read paths for the Courier queue, Admin oversight table, and single-Delivery lookups.
import type { DeliveryDocument, DeliveryStage } from './delivery.types.js';
import * as deliveryQueueRepository from './delivery.queue.repository.js';
import { orderInterface } from '../orders/order.interface.js';
import { listingInterface } from '../listings/listing.interface.js';
import { createHttpError } from './delivery.errors.js';
import type {
  AdminDeliveryFilter,
  DeliveryPage,
} from './delivery.types.js';
import type { DeliveryQueueQuery } from './delivery.schemas.js';
import { toQueueDeliveryResponseDto } from './delivery.dto.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';
import type { DeliveryContext, DeliveryViewerRole, DeliveryWithPickupAddress, QueueDeliveryPage } from './delivery.types.js';

/** Collects the distinct, defined ids in `values`, preserving first-seen order. */
function distinctIds(values: Array<unknown>): string[] {
  const ids = new Set<string>();

  for (const value of values) {
    if (value) ids.add(String(value));
  }

  return [...ids];
}

/**
 * Reads one page of the shared Courier queue (E2), hydrated with the Order
 * and Donor fields a Courier needs to decide whether to claim.
 *
 * Hydration is two bulk calls through other modules' interfaces rather than a
 * lookup per row, so a page costs a constant number of queries regardless of
 * its size — resolving each row individually would cost three queries each.
 * The calls are sequential rather than parallel because the Listing ids come
 * from the Orders. The Donor summary carries the pickup address/location too,
 * so showing where the food is collected costs no extra query (E2/E5).
 */
async function listQueue(query: DeliveryQueueQuery): Promise<QueueDeliveryPage> {
  const page = await deliveryQueueRepository.findQueue(query);

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

  const donorSummaryByListingId = new Map(
    donorSummaries.map((summary) => [summary.listingId, summary]),
  );

  return {
    ...page,
    items: page.items.map((delivery) => {
      const order = orderById.get(String(delivery.orderId));
      const donorSummary = order
        ? donorSummaryByListingId.get(String(order.listingId))
        : undefined;

      return toQueueDeliveryResponseDto(delivery, {
        order: order
          ? {
              quantity: order.quantity,
              deliveryAddressText: order.deliveryAddressText,
              deliveryLocation: order.deliveryLocation,
              amount: order.amount,
              paymentMethod: order.paymentMethod,
            }
          : null,
        listingName: donorSummary?.listingName ?? null,
        companyName: donorSummary?.companyName ?? null,
        pickupAddressText: donorSummary?.addressText,
        pickupAddressLocation: donorSummary?.location,
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
  return deliveryQueueRepository.listForAdmin(filter);
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

/**
 * Loads the Order behind a Delivery once, and resolves the pickup address from
 * its Listing. Callers that also need the Recipient (to emit to them) use the
 * returned `order` rather than fetching it again.
 */
async function loadDeliveryContext(
  delivery: DeliveryDocument,
): Promise<DeliveryContext> {
  const order = await orderInterface.findOrderById(String(delivery.orderId));

  if (!order) {
    return {
      view: {
        delivery,
        pickupAddressText: undefined,
        pickupAddressLocation: undefined,
        order: null,
      },
      order: null,
    };
  }

  return {
    view: { delivery, ...(await resolvePickupAddress(String(order.listingId))), order },
    order,
  };
}

/** Loads a Delivery's Order and resolves its pickup address in one step. */
async function withPickupAddress(
  delivery: DeliveryDocument,
): Promise<DeliveryWithPickupAddress> {
  return (await loadDeliveryContext(delivery)).view;
}

/**
 * Returns the Courier's one in-flight Delivery (E4). A 404 is the documented
 * signal for the client to fall through to the queue, not an error condition.
 */
async function getActiveDelivery(
  courierId: string,
): Promise<DeliveryWithPickupAddress> {
  const active = await deliveryQueueRepository.findActiveByCourier(courierId);

  if (!active) {
    throw createHttpError(404, 'You have no active Delivery.');
  }

  return withPickupAddress(active);
}

/**
 * Reads one Delivery for the Recipient tracking view or Admin oversight (E8).
 *
 * A Recipient who does not own the Order gets `404` rather than `403`: a `403`
 * would confirm the Delivery exists, turning this into an existence oracle for
 * other people's orders. Ownership uses the same `verifyOrderOwnership` the
 * socket layer's `order:join` uses, so "may I see this order" has one
 * definition.
 *
 * Not reachable by a `COURIER` — the route guard excludes them, and a Courier
 * reaches their own Delivery through `/active` or the claim/pickup/deliver
 * responses, never by arbitrary id (E5).
 */
async function getDeliveryById(
  deliveryId: string,
  userId: string,
  role: DeliveryViewerRole,
): Promise<DeliveryWithPickupAddress> {
  const delivery = await deliveryQueueRepository.findDeliveryById(deliveryId);

  if (!delivery) {
    throw createHttpError(404, 'Delivery not found.');
  }

  if (role !== 'ADMIN') {
    const owns = await orderInterface.verifyOrderOwnership(
      String(delivery.orderId),
      userId,
    );

    if (!owns) {
      throw createHttpError(404, 'Delivery not found.');
    }
  }

  return withPickupAddress(delivery);
}

export {
  listQueue,
  listForAdmin,
  resolvePickupAddress,
  loadDeliveryContext,
  withPickupAddress,
  getActiveDelivery,
  getDeliveryById,
};
export type { QueueDeliveryPage, DeliveryViewerRole } from './delivery.types.js';
