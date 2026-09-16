// Contains the subscription checkout path. Cross-module calls go through interfaces only.
import { env } from '../../config/env.js';
import { paymentInterface } from '../payments/payment.interface.js';

/**
 * Starts a Stripe Checkout Session for the $5/month Premium subscription (F1).
 * Creates no SUBSCRIPTION row and sends no email — those happen later, in the webhook, once
 * Stripe confirms `invoice.paid`.
 * @param recipientId - a Recipient's USER._id
 */
async function startCheckout(recipientId: string) {
  const customerId = await paymentInterface.getOrCreateStripeCustomer(recipientId);

  return paymentInterface.startSubscriptionCheckout({
    customerId,
    successUrl: `${env.clientUrl}/subscription?status=success`,
    cancelUrl: `${env.clientUrl}/subscription?status=cancelled`,
    metadata: { userId: String(recipientId) },
  });
}

export { startCheckout };
