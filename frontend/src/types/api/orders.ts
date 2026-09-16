// Order and reservation DTOs, payment types, and checkout shapes.
// Corresponds to API Design §7 (Orders Module) and §8 (Reservations).

import type { GeoLocation } from './common';
import type { ListingUnit, FoodCategory } from './listings';
import type { DeliveryStage } from './delivery';

export type OrderIntakePath =
  | 'RESERVATION'
  | 'DONOR_INITIATED';

export type PaymentMethod =
  | 'STRIPE'
  | 'CASH';

export type PaymentStatus =
  | 'FREE'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PREPARING'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderDTO {
  id: string;
  recipientId: string;
  listing: {
    id: string;
    name?: string;
    imageUrl?: string | null;
    unit?: ListingUnit;
    category?: FoodCategory;
  };
  intakePath: OrderIntakePath;
  quantity: number;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  delivery: { stage: DeliveryStage; id: string | null } | null;
  /** Present for Reservations; omitted for completed in-person manual donations. */
  deliveryAddressText?: string;
  /** Present for Reservations; omitted for completed in-person manual donations. */
  deliveryLocation?: GeoLocation;
  cancelledByUserId: string | null;
  feedback: {
    comment: string;
    createdAt: string;
  } | null;
  createdAt: string;
}

export interface RecipientOrderDTO extends OrderDTO {
  donor: {
    id: string;
    companyName: string;
  };
}

export interface SubmitFeedbackResponseDto {
  feedback: {
    comment: string;
    createdAt: string;
  };
}

export type RefundStatus = 'NOT_APPLICABLE' | 'REFUND_PENDING' | 'FAILED';
export type CancelOrderResponseDto = OrderDTO & { refundStatus: RefundStatus };

export interface ReserveListingPayload {
  quantity: number;
  deliveryAddressText: string;
  deliveryLocation: { latitude: number; longitude: number };
  /** Required when listing.price > 0; must be omitted for a free listing. */
  paymentMethod?: PaymentMethod;
}

export interface CheckoutSessionResponseDto {
  checkoutUrl: string;
}
