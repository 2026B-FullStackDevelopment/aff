// Shapes NotificationPreference request/response data crossing the backend's external boundary.
import type { NotificationPreferenceDocument } from './notification-preference.types.js';
import type { FoodCategory } from '../listings/listing.types.js';

interface NotificationPreferenceResponseDto {
  id: string;
  preferenceTitle: string;
  categories: FoodCategory[];
  vegetarian: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
  city: string | null;
  isActive: boolean;
}

function toNotificationPreferenceResponseDto(
  preference: NotificationPreferenceDocument
): NotificationPreferenceResponseDto {
  return {
    id: String(preference._id),
    preferenceTitle: preference.preferenceTitle,
    categories: preference.categories,
    vegetarian: preference.vegetarian,
    priceMin: preference.priceMin,
    priceMax: preference.priceMax,
    city: preference.city,
    isActive: preference.isActive,
  };
}

export { toNotificationPreferenceResponseDto };
export type { NotificationPreferenceResponseDto };
