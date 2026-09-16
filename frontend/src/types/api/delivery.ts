// Delivery stages, courier queue DTO, and admin delivery views.
// Corresponds to API Design §9 (Delivery Module).

import type { GeoLocation } from './common';

export type DeliveryStage =
  | 'AWAITING_COURIER'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DeliveryDTO {
  id: string;
  orderId: string;
  courierId: string | null;
  stage: DeliveryStage;
  // Denormalised from the Order's Donor. Null only when the Listing or Donor
  // profile could not be loaded — a queue row is still shown without a pin.
  pickupAddressText: string | null;
  pickupAddressLocation: GeoLocation | null;
  deliveryAddressText: string | null;
  deliveryLocation: GeoLocation | null;
  // Derived server-side. The Courier is told whether to collect money, never
  // how the Recipient paid.
  requiresCashCollection: boolean;
  amount: number | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  courierLastLocation: GeoLocation | null;
  createdAt: string;
}

/** A read-only Delivery row enriched for Admin oversight. */
export interface AdminDeliveryDTO extends DeliveryDTO {
  courier: { id: string; fullName: string } | null;
  order: { id: string; recipientId: string | null };
}

/**
 * A queue row (E2): a deliberately lean shape, NOT a `DeliveryDTO`. An
 * unclaimed row has no courier, no timestamps and a constant stage, so those
 * are not sent. Each block nulls as a unit when its join could not be loaded.
 */
export interface QueueDeliveryDTO {
  id: string;
  createdAt: string;
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
    requiresCashCollection: boolean;
  };
  donor: { companyName: string | null };
}
