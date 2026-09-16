// Exposes safe subscription operations for other modules without importing subscription's split services directly.
import * as subscriptionQueryService from './subscription.query.service.js';
import * as subscriptionBillingService from './subscription.billing.service.js';

const subscriptionInterface = {
  isPremiumRecipient: subscriptionQueryService.isPremiumRecipient,
  getMySubscriptionStatus: subscriptionQueryService.getMySubscriptionStatus,
  appendBillingCycle: subscriptionBillingService.appendBillingCycle,
  markLatestPastDue: subscriptionBillingService.markLatestPastDue,
  markLatestCancelled: subscriptionBillingService.markLatestCancelled,
};

export { subscriptionInterface };
