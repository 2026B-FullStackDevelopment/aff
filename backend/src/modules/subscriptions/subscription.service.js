// Contains premium subscription rules and talks to payments through an integration wrapper.
const subscriptionRepository = require('./subscription.repository');
const { userInterface } = require('../users/user.interface');
const { createPaymentIntent } = require('../../integrations/payment/payment.provider');

async function startPremiumSubscription(userId, payload) {
  const payment = await createPaymentIntent({ plan: payload.plan || 'premium-monthly' });
  const subscription = await subscriptionRepository.createSubscription({
    userId,
    plan: payload.plan || 'premium-monthly',
    status: 'ACTIVE',
    paymentReference: payment.clientSecret,
  });

  await userInterface.updatePremiumStatus(userId, true);
  return subscription;
}

async function isPremiumRecipient(userId) {
  const user = await userInterface.getUserById(userId);
  return Boolean(user?.isPremium);
}

module.exports = { startPremiumSubscription, isPremiumRecipient };
