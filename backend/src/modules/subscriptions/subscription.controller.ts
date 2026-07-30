// Handles subscription HTTP requests and returns subscription DTOs.
const subscriptionService = require('./subscription.service');
const { toSubscriptionDto } = require('./subscription.dto');
const { created } = require('../../shared/http/response');

async function startPremiumSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.startPremiumSubscription(req.user.id, req.body);
    return created(res, toSubscriptionDto(subscription));
  } catch (error) {
    return next(error);
  }
}

module.exports = { startPremiumSubscription };
