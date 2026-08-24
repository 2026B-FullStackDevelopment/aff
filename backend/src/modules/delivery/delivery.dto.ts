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

export { toDeliveryResponseDto };
export type { DeliveryResponseDto, ToDeliveryResponseDtoOptions };
