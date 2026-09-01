// Shapes order data before sending it to the frontend or another module, and the request/response bodies for the module's other endpoints.
import type { OrderDocument, IntakePath, PaymentMethod, PaymentStatus, OrderStatus, OrderFeedback } from './order.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';
import type { DeliveryStage } from '../delivery/delivery.model.js';

interface OrderListingSummary {
  id: string;
  name: string | undefined;
  imageUrl: string | undefined;
  unit: string | undefined;
}

interface OrderResponseDto {
  id: string;
  recipientId: string;
  listing: OrderListingSummary;
  intakePath: IntakePath;
  quantity: number;
  amount: number;
  paymentMethod: PaymentMethod | undefined;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryAddressText: string;
  deliveryLocation: GeoLocation;
  cancelledByUserId: string | null;
  feedback: OrderFeedback | null;
  createdAt: Date;
  delivery: { stage: DeliveryStage } | null;
}

interface CancelOrderResponseDto extends OrderResponseDto {
  // NOT_APPLICABLE: free/cash/never-paid order, no Stripe call made. REFUND_PENDING: Stripe refund
  // call succeeded synchronously, awaiting the charge.refunded webhook for final confirmation.
  // FAILED: the Stripe refund call itself errored — cancellation still proceeded regardless.
  refundStatus: 'NOT_APPLICABLE' | 'REFUND_PENDING' | 'FAILED';
}

interface SubmitFeedbackRequestDto {
  comment: string;
}

interface SubmitFeedbackResponseDto {
  feedback: { comment: string; createdAt: Date };
}

interface CreateOrderCheckoutSessionResponseDto {
  checkoutUrl: string;
}

function toOrderResponseDto(
  order: OrderDocument | null,
  deliveryStage: DeliveryStage | null = null,
): OrderResponseDto | null {
  if (!order) return null;

  return {
    id: String(order._id),
    recipientId: String(order.recipientId),
    listing: {
      id: String(order.listingId),
      name: undefined,
      imageUrl: undefined,
      unit: undefined,
    },
    intakePath: order.intakePath,
    quantity: order.quantity,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    deliveryAddressText: order.deliveryAddressText,
    deliveryLocation: order.deliveryLocation,
    cancelledByUserId: order.cancelledByUserId ? String(order.cancelledByUserId) : null,
    feedback: order.feedback ?? null,
    createdAt: order.createdAt,
    delivery: deliveryStage ? { stage: deliveryStage } : null,
  };
}

/** Builds the `DELETE /orders/:id` response (D4), embedding the post-cancel refund state. */
function toCancelOrderResponseDto(
  order: OrderDocument,
  refundStatus: CancelOrderResponseDto['refundStatus'],
  deliveryStage: DeliveryStage | null = null,
): CancelOrderResponseDto {
  return {
    ...toOrderResponseDto(order, deliveryStage)!,
    refundStatus,
  };
}

/**
 * Data needed to build a row for `GET /orders/mine` (D5): the raw Order plus its Listing/Donor
 * summaries and live Delivery stage, as joined by `order.repository.ts#findOrdersForRecipient`.
 */
interface RecipientOrderDtoSource {
  order: OrderDocument;
  listing: {
    id: string;
    name: string;
    imageUrl: string | undefined;
    unit: string;
  };
  donor: {
    id: string;
    companyName: string;
  };
  deliveryStage: DeliveryStage | null;
}

/**
 * `GET /orders/mine` returns `OrderDTO` with an additional Donor summary, so a Recipient's
 * history list doesn't need a second call per row to look up who donated each order.
 */
interface RecipientOrderResponseDto extends OrderResponseDto {
  donor: {
    id: string;
    companyName: string;
  };
}

/**
 * Maps a joined Order row into the shape returned by `GET /orders/mine` — same
 * "build the base DTO, then override/extend" shape as `listing.dto.ts#toListingOrderResponseDto`.
 */
function toRecipientOrderResponseDto(
  source: RecipientOrderDtoSource,
): RecipientOrderResponseDto {
  const order = toOrderResponseDto(source.order, source.deliveryStage);

  if (!order) {
    throw new Error('Cannot map a missing Order.');
  }

  return {
    ...order,
    listing: source.listing,
    donor: source.donor,
  };
}

export {
  toOrderResponseDto,
  toCancelOrderResponseDto,
  toRecipientOrderResponseDto,
};
export type {
  OrderListingSummary,
  OrderResponseDto,
  CancelOrderResponseDto,
  SubmitFeedbackRequestDto,
  SubmitFeedbackResponseDto,
  CreateOrderCheckoutSessionResponseDto,
  RecipientOrderDtoSource,
  RecipientOrderResponseDto,
};
