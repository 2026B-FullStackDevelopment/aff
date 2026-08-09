// Contains premium subscription rules and talks to payments through an integration wrapper.
import * as subscriptionRepository from './subscription.repository.js';
import { userInterface } from '../users/user.interface.js';
import { createPaymentIntent } from '../../integrations/payment/payment.provider.js';

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

export { startPremiumSubscription, isPremiumRecipient };
