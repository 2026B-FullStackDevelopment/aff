// Exposes safe subscription operations for other modules without importing subscription.service directly.
import * as subscriptionService from './subscription.service.js';

const subscriptionInterface = {
  isPremiumRecipient: subscriptionService.isPremiumRecipient,
  getMySubscriptionStatus: subscriptionService.getMySubscriptionStatus,
  appendBillingCycle: subscriptionService.appendBillingCycle,
  markLatestPastDue: subscriptionService.markLatestPastDue,
  markLatestCancelled: subscriptionService.markLatestCancelled,
};

export { subscriptionInterface };
