// Matches a newly created/cloned Listing against every active Premium Recipient's saved
// NotificationPreference (F3) and sends one PREMIUM_MATCH notification per surviving match.
import type { ListingDocument } from './listing.model.js';
import type { NotificationPreferenceDocument } from '../notification-preferences/notification-preference.model.js';

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

export { matchesPreference };
export type { MatchableListing };
