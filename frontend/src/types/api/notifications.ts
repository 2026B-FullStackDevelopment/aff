// Notification DTOs and notification preference types.
// Corresponds to API Design §11 (Notifications Module) and §11A (Notification Preferences).

import type { FoodCategory } from './listings';

export interface NotificationDTO {
  id: string;
  type: 'SOLD_OUT' | 'PREMIUM_MATCH' | 'ADMIN_CANCEL' | 'PAYMENT_SUCCESS' | 'PAYMENT_REFUNDED' | 'DELIVERY_STATUS';
  message: string;
  orderId: string | null;
  listingId: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  preferenceTitle: string;
  categories: FoodCategory[];
  vegetarian: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
  city: string | null;
  isActive: boolean;
}

export interface CreateNotificationPreferencePayload {
  preferenceTitle: string;
  categories?: FoodCategory[];
  vegetarian?: boolean | null;
  priceMin?: number | null;
  priceMax?: number | null;
  city?: string | null;
  isActive?: boolean;
}

export type UpdateNotificationPreferencePayload = Partial<CreateNotificationPreferencePayload>;
