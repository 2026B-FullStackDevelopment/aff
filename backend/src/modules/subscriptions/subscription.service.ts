// Contains premium subscription rules, deriving a Recipient's premium status from their latest SUBSCRIPTION row.
import * as subscriptionRepository from './subscription.repository.js';

async function isPremiumRecipient(recipientId: string): Promise<boolean> {
  const subscription = await subscriptionRepository.findLatestSubscriptionByRecipientId(recipientId);

  if (!subscription) {
    return false;
  }

  return subscription.status === 'ACTIVE' && subscription.currentPeriodEnd > new Date();
}

export { isPremiumRecipient };
