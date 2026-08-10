// Shapes subscription data before sending it to the frontend, and the request/response bodies for the module's other endpoints.
import type { SubscriptionDocument, SubscriptionStatus } from './subscription.model.js';

// Duplicated here until the listings module is typed and exports its own FoodCategory type.
type FoodCategory = 'FRUIT' | 'VEGETABLE' | 'MEAT' | 'COOKED_DISH' | 'BAKED_GOODS' | 'DRINK';

interface NotificationPreference {
  id: string;
  preferenceTitle: string;
  categories: FoodCategory[];
  vegetarian: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
  city: string | null;
}

interface SubscriptionResponseDto {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  createdAt: Date;
}

interface SubscriptionStatusResponseDto {
  tier: 'STANDARD' | 'PREMIUM';
  subscription: SubscriptionResponseDto | null;
}

interface CheckoutSessionResponseDto {
  checkoutUrl: string;
}

interface UpdateNotificationPreferencesRequestDto {
  preferences: NotificationPreference[];
}

interface UpdateNotificationPreferencesResponseDto {
  notificationPreferences: NotificationPreference[];
}

function toSubscriptionResponseDto(subscription: SubscriptionDocument | null): SubscriptionResponseDto | null {
  if (!subscription) return null;

  return {
    id: String(subscription._id),
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    createdAt: subscription.createdAt,
  };
}

export { toSubscriptionResponseDto };
export type {
  NotificationPreference,
  SubscriptionResponseDto,
  SubscriptionStatusResponseDto,
  CheckoutSessionResponseDto,
  UpdateNotificationPreferencesRequestDto,
  UpdateNotificationPreferencesResponseDto,
};
