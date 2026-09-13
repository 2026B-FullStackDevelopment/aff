// Shapes subscription data before sending it to the frontend, and the request/response bodies for the module's other endpoints.
import type { SubscriptionDocument, SubscriptionStatus } from './subscription.model.js';

interface SubscriptionResponseDto {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

interface SubscriptionStatusResponseDto {
  tier: 'STANDARD' | 'PREMIUM';
  subscription: SubscriptionResponseDto | null;
}

interface CheckoutSessionResponseDto {
  checkoutUrl: string;
}

function toSubscriptionResponseDto(subscription: SubscriptionDocument | null): SubscriptionResponseDto | null {
  if (!subscription) return null;

  return {
    id: String(subscription._id),
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt: subscription.createdAt,
  };
}

export { toSubscriptionResponseDto };
export type { SubscriptionResponseDto, SubscriptionStatusResponseDto, CheckoutSessionResponseDto };
