// Exposes safe subscription operations for other modules without importing subscription.service directly.
const subscriptionService = require('./subscription.service');

const subscriptionInterface = {
  isPremiumRecipient: subscriptionService.isPremiumRecipient,
};

module.exports = { subscriptionInterface };
