// Defines internal persistence, repository, and service types for Deliveries.
import type mongoose from 'mongoose';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';
import type { orderInterface } from '../orders/order.interface.js';
import type { DeliveryOrderSource, QueueDeliveryResponseDto } from './delivery.dto.js';

type DeliveryStage = 'AWAITING_COURIER' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
interface DeliveryAttrs {
  orderId: mongoose.Types.ObjectId; courierId?: mongoose.Types.ObjectId; stage: DeliveryStage;
  pickedUpAt?: Date; deliveredAt?: Date; courierLastLocation?: GeoLocation;
  createdAt: Date; cancelledAt?: Date;
}
interface DeliveryDocument extends DeliveryAttrs, mongoose.Document {}
interface AdminDeliveryFilter { page: number; limit: number; stage?: DeliveryStage }
interface DeliveryPage { items: DeliveryDocument[]; page: number; limit: number; total: number }
interface DeliveryAggregationResult { items: DeliveryDocument[]; metadata: Array<{ total: number }> }
interface QueueFilter { page: number; limit: number }
interface DeliveryWithPickupAddress {
  delivery: DeliveryDocument;
  pickupAddressText: string | undefined;
  pickupAddressLocation: GeoLocation | undefined;
  order: DeliveryOrderSource | null;
}
interface QueueDeliveryPage { items: QueueDeliveryResponseDto[]; page: number; limit: number; total: number }
type DeliveryViewerRole = 'RECIPIENT' | 'ADMIN';
interface DeliveryContext {
  view: DeliveryWithPickupAddress;
  order: Awaited<ReturnType<typeof orderInterface.findOrderById>> | null;
}

export type {
  DeliveryStage, DeliveryAttrs, DeliveryDocument, AdminDeliveryFilter, DeliveryPage,
  DeliveryAggregationResult, QueueFilter, DeliveryWithPickupAddress, QueueDeliveryPage,
  DeliveryViewerRole, DeliveryContext,
};
