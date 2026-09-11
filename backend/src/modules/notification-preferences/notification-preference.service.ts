// Contains NotificationPreference business rules: Premium gating and ownership-scoped CRUD.
import { isValidObjectId } from 'mongoose';
import * as notificationPreferenceRepository from './notification-preference.repository.js';
import { subscriptionInterface } from '../subscriptions/subscription.interface.js';
import type {
  CreateNotificationPreferenceInput,
  UpdateNotificationPreferenceInput,
} from './notification-preference.schemas.js';

function createHttpError(statusCode: number, message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function requirePremium(recipientId: string): Promise<void> {
  const isPremium = await subscriptionInterface.isPremiumRecipient(recipientId);

  if (!isPremium) {
    throw createHttpError(403, 'Only Premium Recipients can manage notification preferences.');
  }
}

// No Premium gate — a downgraded Recipient keeps read access to stored rows,
// just loses the ability to write them (F2 AC: keeps stored rows, loses edit access).
async function listPreferences(recipientId: string) {
  return notificationPreferenceRepository.findPreferencesByRecipientId(recipientId);
}

async function createPreference(recipientId: string, input: CreateNotificationPreferenceInput) {
  await requirePremium(recipientId);

  return notificationPreferenceRepository.createPreference(recipientId, {
    preferenceTitle: input.preferenceTitle,
    categories: input.categories ?? [],
    vegetarian: input.vegetarian ?? null,
    priceMin: input.priceMin ?? null,
    priceMax: input.priceMax ?? null,
    city: input.city ?? null,
    isActive: input.isActive ?? true,
  });
}

async function updatePreference(recipientId: string, preferenceId: string, input: UpdateNotificationPreferenceInput) {
  if (!isValidObjectId(preferenceId)) {
    throw createHttpError(404, 'Notification preference not found.');
  }

  await requirePremium(recipientId);

  if ('priceMin' in input || 'priceMax' in input) {
    const existing = await notificationPreferenceRepository.findPreferenceByIdAndRecipient(preferenceId, recipientId);

    if (existing) {
      const effectivePriceMin = 'priceMin' in input ? input.priceMin : existing.priceMin;
      const effectivePriceMax = 'priceMax' in input ? input.priceMax : existing.priceMax;

      if (effectivePriceMin != null && effectivePriceMax != null && effectivePriceMin > effectivePriceMax) {
        throw createHttpError(400, 'Minimum price cannot be greater than maximum price.');
      }
    }
  }

  const updated = await notificationPreferenceRepository.updatePreferenceByIdAndRecipient(preferenceId, recipientId, input);

  if (!updated) {
    throw createHttpError(404, 'Notification preference not found.');
  }

  return updated;
}

async function deletePreference(recipientId: string, preferenceId: string): Promise<void> {
  if (!isValidObjectId(preferenceId)) {
    throw createHttpError(404, 'Notification preference not found.');
  }

  await requirePremium(recipientId);

  const deleted = await notificationPreferenceRepository.deletePreferenceByIdAndRecipient(preferenceId, recipientId);

  if (!deleted) {
    throw createHttpError(404, 'Notification preference not found.');
  }
}

// For F3's future matcher: active preferences across every Recipient, tier
// re-checked by the caller per row (F3 doc: "re-check tier at match time,
// don't trust a cached flag").
async function listActivePreferencesForMatching() {
  return notificationPreferenceRepository.findAllActivePreferences();
}

export { listPreferences, createPreference, updatePreference, deletePreference, listActivePreferencesForMatching };
