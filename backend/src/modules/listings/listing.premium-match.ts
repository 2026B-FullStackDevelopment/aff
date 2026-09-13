// Matches a newly created/cloned Listing against every active Premium Recipient's saved
// NotificationPreference (F3) and sends one PREMIUM_MATCH notification per surviving match.
import type { ListingDocument } from './listing.model.js';
import type { NotificationPreferenceDocument } from '../notification-preferences/notification-preference.model.js';

import { notificationPreferenceInterface } from '../notification-preferences/notification-preference.interface.js';
import { subscriptionInterface } from '../subscriptions/subscription.interface.js';
import { notificationInterface } from '../notifications/notification.interface.js';

interface MatchableListing {
  category: ListingDocument['category'];
  isVegetarian: ListingDocument['isVegetarian'];
  price: ListingDocument['price'];
  city?: string;
}

/**
 * True iff every non-null field on `preference` is satisfied by `listing`. A null field is
 * "no constraint on that dimension" (F2); `categories: []` is the equivalent no-filter value for
 * the one field that can't be null (F3 AC: a MEAT-only preference matches any MEAT listing at
 * any price/vegetarian-status/city).
 */
function matchesPreference(
  listing: MatchableListing,
  preference: Pick<NotificationPreferenceDocument, 'categories' | 'vegetarian' | 'priceMin' | 'priceMax' | 'city'>,
): boolean {
  if (preference.categories.length > 0 && !preference.categories.includes(listing.category)) {
    return false;
  }

  if (preference.vegetarian != null && preference.vegetarian !== listing.isVegetarian) {
    return false;
  }

  if (preference.priceMin != null && listing.price < preference.priceMin) {
    return false;
  }

  if (preference.priceMax != null && listing.price > preference.priceMax) {
    return false;
  }

  if (preference.city != null && preference.city !== listing.city) {
    return false;
  }

  return true;
}

/**
 * Scans every active NotificationPreference against a newly ACTIVE Listing and sends
 * `PREMIUM_MATCH` to each still-Premium Recipient whose preference matches (F3). Never throws:
 * a failure loading preferences is logged and matching is skipped entirely; a failure on one
 * candidate (tier lookup or send) is logged and does not stop the rest. Either way, the
 * create/clone request this is called from is never blocked or failed by this function.
 */
async function notifyPremiumMatches(listing: ListingDocument): Promise<void> {
  try {
    let preferences: NotificationPreferenceDocument[];

    try {
      preferences = await notificationPreferenceInterface.listActivePreferencesForMatching();
    } catch (error) {
      console.error('Failed to load notification preferences for F3 matching:', error);
      return;
    }

    const matches = preferences.filter((preference) => matchesPreference(listing, preference));

    await Promise.all(
      matches.map(async (preference) => {
        try {
          const recipientId = String(preference.recipientId);

          const isPremium = await subscriptionInterface.isPremiumRecipient(recipientId);
          if (!isPremium) return;

          await notificationInterface.sendNotification({
            userId: recipientId,
            type: 'PREMIUM_MATCH',
            listingId: String(listing._id),
            payload: {
              listingId: String(listing._id),
              name: listing.name,
              matchedPreferenceId: String(preference._id),
              preferenceTitle: preference.preferenceTitle,
            },
          });
        } catch (error) {
          console.error(
            `Failed to process a PREMIUM_MATCH candidate for preference ${String(preference._id)}:`,
            error,
          );
        }
      }),
    );
  } catch (error) {
    // Backstop for the "never throws" guarantee above: covers anything between the two inner
    // try/catches (e.g. matchesPreference throwing on a malformed stored preference) that would
    // otherwise surface as an unhandled promise rejection at the `void notifyPremiumMatches(...)`
    // call sites in listing.service.ts.
    console.error('Unexpected failure while processing PREMIUM_MATCH candidates:', error);
  }
}

export { matchesPreference, notifyPremiumMatches };
export type { MatchableListing };
