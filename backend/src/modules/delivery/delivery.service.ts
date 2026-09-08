// Contains Courier Delivery business rules. See docs/api_design.md section 9.
import type { ClientSession } from 'mongoose';
import type { DeliveryDocument, DeliveryStage } from './delivery.model.js';
import * as deliveryRepository from './delivery.repository.js';
import { orderInterface } from '../orders/order.interface.js';
import { listingInterface } from '../listings/listing.interface.js';
import { emitToUser, emitToOrder } from '../../realtime/socket.js';
import type {
  AdminDeliveryFilter,
  DeliveryPage,
} from './delivery.repository.js';
import type {
  MarkDeliveredPayload,
  DeliveryQueueQuery,
} from './delivery.schemas.js';
import { toQueueDeliveryResponseDto, requiresCashCollection } from './delivery.dto.js';
import type { QueueDeliveryResponseDto, DeliveryOrderSource } from './delivery.dto.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

/** A Delivery plus its resolved pickup address (E5). */
interface DeliveryWithPickupAddress {
  delivery: DeliveryDocument;
  pickupAddressText: string | undefined;
  pickupAddressLocation: GeoLocation | undefined;
  // The Order fields the Courier's own Delivery response derives from (destination,
  // requiresCashCollection) — null when the Order behind this Delivery could not be loaded.
  order: DeliveryOrderSource | null;
}

/** One page of hydrated queue rows. */
interface QueueDeliveryPage {
  items: QueueDeliveryResponseDto[];
  page: number;
  limit: number;
  total: number;
}

/** The roles `GET /deliveries/:id` accepts, per the route's own guard. */
type DeliveryViewerRole = 'RECIPIENT' | 'ADMIN';

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
 * from the Orders. The Donor summary carries the pickup address/location too,
 * so showing where the food is collected costs no extra query (E2/E5).
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

/** A Delivery's public view plus the Order behind it, loaded once. */
interface DeliveryContext {
  view: DeliveryWithPickupAddress;
  // Union with null explicitly: `findOrderById` uses `.lean<OrderDocument>()`,
  // so its inferred return type is not nullable even though it resolves to
  // null for a missing row. Importing `OrderDocument` to say so directly would
  // cross a module boundary (docs/api_design.md A.3.1), so derive it from the
  // interface and widen it here.
  order: Awaited<ReturnType<typeof orderInterface.findOrderById>> | null;
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
 * Tells a Recipient their Delivery moved to a new stage (E8).
 *
 * Fires on claim, pickup and deliver only — never on cancellation. Cascade
 * cancellation is a bulk update over many orders, the Recipient's stepper has
 * no cancelled state, and cancellations reach them through
 * `notification:admin_cancel` instead. See D4 in the design doc.
 */
function emitStageChanged(orderId: string, recipientId: string, stage: DeliveryStage) {
  emitToUser(recipientId, 'order:status_changed', { orderId, stage });
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

  return loadContextAndNotifyStageChange(claimed);
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
  return deliveryRepository.recordCourierLocation(courierId, position);
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
  const { view, recipientId, orderId, deliveredAt } = await deliveryRepository.withTransaction(
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

      const isCashPayment = requiresCashCollection(order);

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
  safeEmit(() => emitStageChanged(orderId, recipientId, view.delivery.stage));
  safeEmit(() => emitToUser(recipientId, 'delivery:delivered', { orderId, deliveredAt }));
  safeEmit(() => emitToOrder(orderId, 'delivery:delivered', { orderId, deliveredAt }));

  return view;
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
  const delivery = await deliveryRepository.findDeliveryById(deliveryId);

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
  recordCourierLocation,
  markDelivered,
  getDeliveryById,
};
export type { QueueDeliveryPage, DeliveryViewerRole };
