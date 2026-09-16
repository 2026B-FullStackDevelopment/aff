import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getOrCreateStripeCustomerMock, startSubscriptionCheckoutMock } = vi.hoisted(() => ({
  getOrCreateStripeCustomerMock: vi.fn(),
  startSubscriptionCheckoutMock: vi.fn(),
}));

vi.mock('../../../src/modules/payments/payment.interface.js', () => ({
  paymentInterface: {
    getOrCreateStripeCustomer: getOrCreateStripeCustomerMock,
    startSubscriptionCheckout: startSubscriptionCheckoutMock,
  },
}));

vi.mock('../../../src/config/env.js', () => ({
  env: { clientUrl: 'https://app.example.com' },
}));

import { startCheckout } from '../../../src/modules/subscriptions/subscription.checkout.service.js';

describe('subscription.checkout.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startCheckout', () => {
    it('gets/creates the Stripe customer then starts a subscription checkout with the right URLs and metadata', async () => {
      getOrCreateStripeCustomerMock.mockResolvedValue('cus_123');
      startSubscriptionCheckoutMock.mockResolvedValue({ checkoutUrl: 'https://checkout.stripe.com/cs_1' });

      const result = await startCheckout('u1');

      expect(getOrCreateStripeCustomerMock).toHaveBeenCalledWith('u1');
      expect(startSubscriptionCheckoutMock).toHaveBeenCalledWith({
        customerId: 'cus_123',
        successUrl: 'https://app.example.com/subscription?status=success',
        cancelUrl: 'https://app.example.com/subscription?status=cancelled',
        metadata: { userId: 'u1' },
      });
      expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/cs_1' });
    });
  });
});
