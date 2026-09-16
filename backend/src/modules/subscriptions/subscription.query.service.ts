// Contains the Recipient-facing subscription read paths. Cross-module calls go through
// interfaces only (see backend/SUBSCRIPTION.md risk #4 — import the *.interface.ts, never
// the *.service.ts, and only call inside functions).
import { userInterface } from '../users/user.interface.js';
import * as subscriptionRepository from './subscription.repository.js';
import { toSubscriptionResponseDto } from './subscription.dto.js';
import type { SubscriptionStatusResponseDto } from './subscription.dto.js';
import type { SubscriptionDocument } from './subscription.types.js';

function isActivePremiumRow(subscription: SubscriptionDocument | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'ACTIVE' && subscription.currentPeriodEnd > new Date();
}

/**
 * True iff `recipientId`'s latest SUBSCRIPTION row is ACTIVE and unexpired. Cheap boolean form of
 * {@link getMySubscriptionStatus}, used by other modules' Premium gates (e.g. notification
 * preferences) that only need a yes/no, not the full DTO.
 * @param recipientId - a Recipient's USER._id
 */
async function isPremiumRecipient(recipientId: string): Promise<boolean> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);
  return isActivePremiumRow(subscription);
}

/**
 * Derives `tier` from the latest SUBSCRIPTION row for `GET /subscriptions/me` (and, via
 * `subscriptionInterface`, `GET /users/me`) — `tier` is never a stored column, only ever computed
 * here from `status` + `currentPeriodEnd`.
 * @param recipientId - a Recipient's USER._id
 */
async function getMySubscriptionStatus(recipientId: string): Promise<SubscriptionStatusResponseDto> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);
  const tier = isActivePremiumRow(subscription) ? 'PREMIUM' : 'STANDARD';

  // Read-repair of the denormalized recipient.tier column. The webhooks below keep it fresh on
  // billing events; this catches the two cases they can't — a webhook Stripe never delivered, and a
  // subscription that simply lapsed at currentPeriodEnd with no further event. The repository
  // filters on tier != this value, so an in-sync row is a no-op rather than a write per request.
  await userInterface.setRecipientTier(recipientId, tier);

  return {
    tier,
    subscription: toSubscriptionResponseDto(subscription),
  };
}

export { isPremiumRecipient, getMySubscriptionStatus, isActivePremiumRow };
