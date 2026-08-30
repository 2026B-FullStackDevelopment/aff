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
}

/** A queue row: the Delivery plus the minimum a Courier needs to decide (E2). */
interface QueueDeliveryResponseDto extends DeliveryResponseDto {
  order: {
    id: string;
    quantity: number | null;
    deliveryAddressText: string | null;
  };
  donor: { companyName: string | null };
}

/** The Order fields a queue row shows, joined by the caller. */
interface QueueDeliveryRelations {
  order: { quantity: number; deliveryAddressText: string } | null;
  companyName: string | null;
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
  };
}

/**
 * Maps a Delivery plus its joined Order and Donor to a queue row.
 *
 * `pickupAddressText`/`pickupAddressLocation` are left undefined: the queue
 * shows where the food is going, not where it is collected, and resolving the
 * Donor address per row would cost a lookup per row for data E2 never asks
 * for. A Courier gets those on claim (E5).
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
      pickupAddressText: undefined,
      pickupAddressLocation: undefined,
    })!,
    order: {
      id: String(delivery.orderId),
      quantity: relations.order?.quantity ?? null,
      deliveryAddressText: relations.order?.deliveryAddressText ?? null,
    },
    donor: { companyName: relations.companyName },
  };
}

export { toDeliveryResponseDto, toQueueDeliveryResponseDto };
export type {
  DeliveryResponseDto,
  ToDeliveryResponseDtoOptions,
  QueueDeliveryResponseDto,
  QueueDeliveryRelations,
};
