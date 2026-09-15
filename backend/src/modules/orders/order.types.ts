// Defines internal persistence and repository types for Orders.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';
import type { DeliveryStage } from '../delivery/delivery.types.js';
import type { FoodCategory, MeasurementUnit } from '../listings/listing.types.js';

type IntakePath = 'RESERVATION' | 'DONOR_INITIATED';
type PaymentMethod = 'STRIPE' | 'CASH';
type PaymentStatus = 'FREE' | 'PAYMENT_PENDING' | 'PAID' | 'REFUND_PENDING' | 'REFUNDED';
type OrderStatus = 'PENDING_PAYMENT' | 'PREPARING' | 'DELIVERED' | 'CANCELLED';
interface OrderFeedback { comment: string; createdAt: Date }
interface OrderAttrs {
  recipientId: mongoose.Types.ObjectId; listingId: mongoose.Types.ObjectId; intakePath: IntakePath;
  quantity: number; amount: number; paymentMethod?: PaymentMethod; paymentStatus: PaymentStatus;
  orderStatus: OrderStatus; deliveryAddressText?: string; deliveryLocation?: GeoLocation;
  cancelledByUserId?: mongoose.Types.ObjectId; cashConfirmedByCourierId?: mongoose.Types.ObjectId;
  cashConfirmedAt?: Date; feedback?: OrderFeedback; createdAt: Date; updatedAt: Date; cancelledAt?: Date;
}
interface OrderDocument extends OrderAttrs, mongoose.Document {}
interface CreateOrderInput {
  recipientId: string | Types.ObjectId; listingId: string | Types.ObjectId; intakePath: IntakePath;
  quantity: number; amount: number; paymentMethod?: PaymentMethod; paymentStatus: PaymentStatus;
  orderStatus: OrderStatus; deliveryAddressText?: string; deliveryLocation?: GeoLocation;
}
interface ListingOrderRepositoryItem { order: OrderDocument; recipient: { id: string; username: string } }
interface ListingOrdersRepositoryResult { items: ListingOrderRepositoryItem[]; page: number; limit: number; total: number }
interface AggregatedListingOrder extends OrderDocument { recipient: { id: string; username: string } }
interface ListingOrdersAggregationResult { items: AggregatedListingOrder[]; metadata: Array<{ total: number }> }
interface OrderJoinSummary {
  _id: Types.ObjectId; recipientId: Types.ObjectId; quantity: number; deliveryAddressText: string;
  deliveryLocation: { latitude: number; longitude: number; updatedAt: Date };
  paymentMethod?: PaymentMethod; paymentStatus: PaymentStatus; listingId: Types.ObjectId; amount: number;
}
interface CancellationOrderSummary { _id: Types.ObjectId; recipientId: Types.ObjectId; listingId: Types.ObjectId }
interface RecipientOrderListingSummary { id: string; name: string; imageUrl: string | undefined; unit: MeasurementUnit; category: FoodCategory }
interface RecipientOrderDonorSummary { id: string; companyName: string }
interface RecipientOrderRepositoryItem { order: OrderDocument; listing: RecipientOrderListingSummary; donor: RecipientOrderDonorSummary; deliveryStage: DeliveryStage | null }
interface RecipientOrdersRepositoryResult { items: RecipientOrderRepositoryItem[]; page: number; limit: number; total: number }
interface AggregatedRecipientOrder extends OrderDocument { listing: RecipientOrderListingSummary; donor: RecipientOrderDonorSummary; deliveryStage: DeliveryStage | null }
interface RecipientOrdersAggregationResult { items: AggregatedRecipientOrder[]; metadata: Array<{ total: number }> }

export type {
  IntakePath, PaymentMethod, PaymentStatus, OrderStatus, OrderFeedback, OrderAttrs, OrderDocument,
  CreateOrderInput, ListingOrderRepositoryItem, ListingOrdersRepositoryResult, AggregatedListingOrder,
  ListingOrdersAggregationResult, OrderJoinSummary, RecipientOrderListingSummary,
  CancellationOrderSummary,
  RecipientOrderDonorSummary, RecipientOrderRepositoryItem, RecipientOrdersRepositoryResult,
  AggregatedRecipientOrder, RecipientOrdersAggregationResult,
};
