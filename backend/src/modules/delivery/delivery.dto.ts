import type { DeliveryDocument, DeliveryStage } from './delivery.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

interface DeliveryResponseDto {
  id: string;
  orderId: string;
  courierId: string | null;
  stage: DeliveryStage;
  pickupAddressText: string | undefined;
  pickupAddressLocation: GeoLocation | undefined;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  courierLastLocation: GeoLocation | null;
  createdAt: Date;
  deliveryAddressText: string | null;
  deliveryLocation: GeoLocation | null;
  // A derived boolean, deliberately not the raw paymentMethod: a Courier needs
  // to know whether to collect money, not how the Recipient paid (spec D5).
  requiresCashCollection: boolean;
  amount: number | null;
}

/** The Order fields every Delivery response derives from, joined by the caller. */
interface DeliveryOrderSource {
  deliveryAddressText?: string;
  deliveryLocation?: GeoLocation;
  paymentMethod?: 'STRIPE' | 'CASH';
  amount?: number;
}

interface ToDeliveryResponseDtoOptions {
  // Both resolved by the caller (joined from the order's Donor) — the Delivery document itself has
  // neither field. `undefined` until that join is wired up. No role gating needed: the Donor's
  // address/location is already public via GET /listings/:id (docs/api_design.md §6) for every
  // listing, Reservation/Donor-initiated included, so withholding it here wouldn't hide anything.
  pickupAddressText: string | undefined;
  // Static — for a map marker, not live-updating. Unlike courierLastLocation, the Donor doesn't
  // move, so there's no tracking concept here, just a fixed pin.
  pickupAddressLocation: GeoLocation | undefined;
  order: DeliveryOrderSource | null;
}

/**
 * A queue row (E2): a deliberately lean shape, NOT a `DeliveryResponseDto`.
 *
 * An `AWAITING_COURIER` row has no courier, no pickup/deliver timestamps and a
 * constant `stage`, so none of that is sent. What remains is what a Courier
 * weighs before claiming: the listing and both ends of the trip (text +
 * coordinates), grouped by where each field comes from so a failed join nulls
 * that whole block rather than scattering nulls across the row.
 */
interface QueueDeliveryResponseDto {
  id: string;
  createdAt: Date;
  listing: {
    name: string | null;
    pickupAddressText: string | null;
    pickupAddressLocation: GeoLocation | null;
  };
  order: {
    quantity: number | null;
    deliveryAddressText: string | null;
    deliveryLocation: GeoLocation | null;
    amount: number | null;
    // See `requiresCashCollection` — the same single rule as the active
    // Delivery response, so a Courier knows before claiming, not just after.
    requiresCashCollection: boolean;
  };
  donor: { companyName: string | null };
}

/** The Order, Listing and Donor fields a queue row shows, joined by the caller. */
interface QueueDeliveryRelations {
  order: {
    quantity: number;
    deliveryAddressText?: string;
    deliveryLocation?: GeoLocation;
    amount: number;
    paymentMethod?: 'STRIPE' | 'CASH';
  } | null;
  // The listing's name, and the Donor's company name. `null` when the Listing
  // or Donor profile could not be loaded — the row is still listed.
  listingName: string | null;
  companyName: string | null;
  // Denormalised from the listing's Donor (E5). `undefined` when the Listing or
  // Donor profile could not be loaded — the row is still listed, without a pin.
  pickupAddressText?: string;
  pickupAddressLocation?: GeoLocation;
}

/**
 * Whether a Courier must collect cash on this Delivery.
 *
 * This is the single definition of that rule. `markDelivered` gates its
 * `cashConfirmed` requirement on the same predicate, so the checkbox the
 * Courier sees appears exactly when the server will demand it. If the two ever
 * diverged, a Courier would receive a 400 demanding confirmation with no
 * control on screen to give it.
 */
function requiresCashCollection(order: DeliveryOrderSource | null | undefined): boolean {
  return order?.paymentMethod === 'CASH';
}

function toDeliveryResponseDto(
  delivery: DeliveryDocument | null,
  options: ToDeliveryResponseDtoOptions
): DeliveryResponseDto | null {
  if (!delivery) return null;

  return {
    id: String(delivery._id),
    orderId: String(delivery.orderId),
    courierId: delivery.courierId ? String(delivery.courierId) : null,
    stage: delivery.stage,
    pickupAddressText: options.pickupAddressText,
    pickupAddressLocation: options.pickupAddressLocation,
    pickedUpAt: delivery.pickedUpAt ?? null,
    deliveredAt: delivery.deliveredAt ?? null,
    courierLastLocation: delivery.courierLastLocation ?? null,
    createdAt: delivery.createdAt,
    deliveryAddressText: options.order?.deliveryAddressText ?? null,
    deliveryLocation: options.order?.deliveryLocation ?? null,
    requiresCashCollection: requiresCashCollection(options.order),
    amount: options.order?.amount ?? null,
  };
}

/**
 * Maps a Delivery plus its joined Order, Listing and Donor to a queue row.
 *
 * Built field by field rather than derived from `toDeliveryResponseDto`: a
 * queue row is a lean shape, not a `DeliveryResponseDto`. Pickup and delivery
 * text/coordinates all come from joins the caller already does in bulk (the
 * Listing→Donor summary, the Order), so this costs no extra query per row.
 *
 * Each `listing`/`order`/`donor` block degrades to nulls as a unit when its
 * join could not be loaded, rather than the row being dropped — so
 * `items.length` stays consistent with `total` and a claimable Delivery is
 * never silently hidden from the queue.
 */
function toQueueDeliveryResponseDto(
  delivery: DeliveryDocument,
  relations: QueueDeliveryRelations,
): QueueDeliveryResponseDto {
  return {
    id: String(delivery._id),
    createdAt: delivery.createdAt,
    listing: {
      name: relations.listingName,
      pickupAddressText: relations.pickupAddressText ?? null,
      pickupAddressLocation: relations.pickupAddressLocation ?? null,
    },
    order: {
      quantity: relations.order?.quantity ?? null,
      deliveryAddressText: relations.order?.deliveryAddressText ?? null,
      deliveryLocation: relations.order?.deliveryLocation ?? null,
      amount: relations.order?.amount ?? null,
      requiresCashCollection: requiresCashCollection(relations.order),
    },
    donor: { companyName: relations.companyName },
  };
}

export { toDeliveryResponseDto, toQueueDeliveryResponseDto, requiresCashCollection };
export type {
  DeliveryResponseDto,
  ToDeliveryResponseDtoOptions,
  QueueDeliveryResponseDto,
  QueueDeliveryRelations,
  DeliveryOrderSource,
};
