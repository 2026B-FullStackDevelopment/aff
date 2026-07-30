// Contains subscription database queries so services do not call Mongoose directly.
const Subscription = require('./subscription.model');

function createSubscription(data) {
  return Subscription.create(data);
}

function findActiveSubscriptionByUser(userId) {
  return Subscription.findOne({ userId, status: 'ACTIVE' }).lean();
}

module.exports = { createSubscription, findActiveSubscriptionByUser };
