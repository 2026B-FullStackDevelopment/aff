// Exposes safe subscription operations for other modules without importing subscription.service directly.
import * as subscriptionService from './subscription.service.js';

const subscriptionInterface = {
  isPremiumRecipient: subscriptionService.isPremiumRecipient,
};

export { subscriptionInterface };
