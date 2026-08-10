import type { DeliveryDocument, DeliveryStage } from './delivery.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

interface DeliveryResponseDto {
  id: string;
  orderId: string;
  courierId: string | null;
  stage: DeliveryStage;
  pickupAddressText: string | undefined;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  courierLastLocation: GeoLocation | null;
  createdAt: Date;
}

function toDeliveryResponseDto(delivery: DeliveryDocument | null): DeliveryResponseDto | null {
  if (!delivery) return null;

  return {
    id: String(delivery._id),
    orderId: String(delivery.orderId),
    courierId: delivery.courierId ? String(delivery.courierId) : null,
    stage: delivery.stage,
    pickupAddressText: undefined,
    pickedUpAt: delivery.pickedUpAt ?? null,
    deliveredAt: delivery.deliveredAt ?? null,
    courierLastLocation: delivery.courierLastLocation ?? null,
    createdAt: delivery.createdAt,
  };
}

export { toDeliveryResponseDto };
export type { DeliveryResponseDto };
