// Handles subscription HTTP requests and returns subscription DTOs.
import * as subscriptionService from './subscription.service.js';
import { toSubscriptionDto } from './subscription.dto.js';
import { created } from '../../shared/http/response.js';

async function startPremiumSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.startPremiumSubscription(req.user.id, req.body);
    return created(res, toSubscriptionDto(subscription));
  } catch (error) {
    return next(error);
  }
}

export { startPremiumSubscription };
