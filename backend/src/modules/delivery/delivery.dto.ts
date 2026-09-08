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
}

/** The Order fields every Delivery response derives from, joined by the caller. */
interface DeliveryOrderSource {
  deliveryAddressText?: string;
  deliveryLocation?: GeoLocation;
  paymentMethod?: 'STRIPE' | 'CASH';
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

/** A queue row: the Delivery plus the minimum a Courier needs to decide (E2). */
interface QueueDeliveryResponseDto extends DeliveryResponseDto {
  order: {
    id: string;
    quantity: number | null;
    deliveryAddressText: string | null;
  };
  listing: { name: string | null };
  donor: { companyName: string | null };
}

/** The Order, Listing and Donor fields a queue row shows, joined by the caller. */
interface QueueDeliveryRelations {
  order: (DeliveryOrderSource & { quantity: number }) | null;
  // The listing's name, and the Donor's company name. `null` when the Listing
  // or Donor profile could not be loaded — the row is still listed.
  listingName: string | null;
  companyName: string | null;
  // Denormalised from the Order's Donor, same as the post-claim DeliveryDTO.
  // `undefined` when the Listing or Donor profile could not be loaded — the row
  // is still listed, just without a pickup pin.
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
  };
}

/**
 * Maps a Delivery plus its joined Order and Donor to a queue row.
 *
 * `pickupAddressText`/`pickupAddressLocation` carry the Donor's collection
 * address so a Courier can judge the trip before claiming (E2/E5). The caller's
 * Donor-summary join already resolves them in bulk, so this costs no extra
 * query per row. They fall back to undefined when the Listing or Donor profile
 * could not be loaded.
 *
 * A row whose Order or Donor could not be loaded is degraded to nulls rather
 * than dropped, so `items.length` stays consistent with `total` and a
 * claimable Delivery is never silently hidden from the queue.
 */
function toQueueDeliveryResponseDto(
  delivery: DeliveryDocument,
  relations: QueueDeliveryRelations,
): QueueDeliveryResponseDto {
  return {
    ...toDeliveryResponseDto(delivery, {
      pickupAddressText: relations.pickupAddressText,
      pickupAddressLocation: relations.pickupAddressLocation,
      order: relations.order,
    })!,
    order: {
      id: String(delivery.orderId),
      quantity: relations.order?.quantity ?? null,
      deliveryAddressText: relations.order?.deliveryAddressText ?? null,
    },
    listing: { name: relations.listingName },
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
