// Shapes subscription data before sending it to the frontend or another module.
function toSubscriptionDto(subscription) {
  if (!subscription) return null;

  return {
    id: String(subscription._id || subscription.id),
    userId: String(subscription.userId),
    plan: subscription.plan,
    status: subscription.status,
  };
}

module.exports = { toSubscriptionDto };
