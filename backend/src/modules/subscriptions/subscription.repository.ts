// Contains subscription database queries so services do not call Mongoose directly.
import Subscription from './subscription.model.js';

function createSubscription(data) {
  return Subscription.create(data);
}

function findActiveSubscriptionByUser(userId) {
  return Subscription.findOne({ userId, status: 'ACTIVE' }).lean();
}

export { createSubscription, findActiveSubscriptionByUser };
