import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createStripeCustomerMock,
  createCheckoutSessionMock,
  createSubscriptionCheckoutSessionMock,
  updateSubscriptionCancelAtPeriodEndMock,
  createPaymentMock,
  getUserByIdMock,
  setRecipientStripeCustomerIdMock,
} = vi.hoisted(() => ({
  createStripeCustomerMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
  createSubscriptionCheckoutSessionMock: vi.fn(),
  updateSubscriptionCancelAtPeriodEndMock: vi.fn(),
  createPaymentMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  setRecipientStripeCustomerIdMock: vi.fn(),
}));

vi.mock('../../../src/integrations/payment/payment.provider.js', () => ({
  createStripeCustomer: createStripeCustomerMock,
  createCheckoutSession: createCheckoutSessionMock,
  createSubscriptionCheckoutSession: createSubscriptionCheckoutSessionMock,
  updateSubscriptionCancelAtPeriodEnd: updateSubscriptionCancelAtPeriodEndMock,
}));

vi.mock('../../../src/modules/payments/payment.repository.js', () => ({
  createPayment: createPaymentMock,
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    getUserById: getUserByIdMock,
    setRecipientStripeCustomerId: setRecipientStripeCustomerIdMock,
  },
}));

import {
  startOneTimeCheckout,
  startSubscriptionCheckout,
  setSubscriptionCancelAtPeriodEnd,
} from '../../../src/modules/payments/payment.checkout.service.js';

describe('payment.checkout.service', () => {
  beforeEach(() => {
    createStripeCustomerMock.mockReset();
    createCheckoutSessionMock.mockReset();
    createSubscriptionCheckoutSessionMock.mockReset();
    updateSubscriptionCancelAtPeriodEndMock.mockReset();
    createPaymentMock.mockReset();
    getUserByIdMock.mockReset();
    setRecipientStripeCustomerIdMock.mockReset();
  });

  describe('startOneTimeCheckout', () => {
    const input = {
      payableType: 'ORDER' as const,
      payableId: 'o1',
      amount: 5000,
      currency: 'usd',
      customerId: 'cus_123',
      successUrl: 'https://app.example.com/success',
      cancelUrl: 'https://app.example.com/cancel',
    };

    it('creates the checkout session and a PENDING Payment row, then returns the checkoutUrl', async () => {
      createCheckoutSessionMock.mockResolvedValue({
        provider: 'stripe',
        sessionId: 'cs_123',
        checkoutUrl: 'https://checkout.stripe.com/cs_123',
      });

      const result = await startOneTimeCheckout(input);

      expect(createPaymentMock).toHaveBeenCalledWith({
        payableType: 'ORDER',
        payableId: 'o1',
        stripeSessionId: 'cs_123',
        amount: 5000,
        currency: 'usd',
        status: 'PENDING',
      });
      expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/cs_123' });
    });

    it('wraps a Stripe failure as a 502 error and does not create a Payment row', async () => {
      createCheckoutSessionMock.mockRejectedValue(new Error('Stripe is down'));

      await expect(startOneTimeCheckout(input)).rejects.toMatchObject({ statusCode: 502 });
      expect(createPaymentMock).not.toHaveBeenCalled();
    });

    it('throws a 502 error if Stripe does not return a checkout URL', async () => {
      createCheckoutSessionMock.mockResolvedValue({ provider: 'stripe', sessionId: 'cs_123', checkoutUrl: null });

      await expect(startOneTimeCheckout(input)).rejects.toMatchObject({ statusCode: 502 });
      expect(createPaymentMock).not.toHaveBeenCalled();
    });

    it('self-heals a stale customerId: recreates the Stripe customer and retries once', async () => {
      const missingCustomerError = Object.assign(new Error("No such customer: 'cus_123'"), {
        code: 'resource_missing',
        param: 'customer',
      });
      createCheckoutSessionMock
        .mockRejectedValueOnce(missingCustomerError)
        .mockResolvedValueOnce({
          provider: 'stripe',
          sessionId: 'cs_456',
          checkoutUrl: 'https://checkout.stripe.com/cs_456',
        });
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });
      createStripeCustomerMock.mockResolvedValue({ provider: 'stripe', customerId: 'cus_fresh' });

      const result = await startOneTimeCheckout({ ...input, userId: 'u1' });

      expect(createStripeCustomerMock).toHaveBeenCalledWith({
        email: 'jane@example.com',
        metadata: { userId: 'u1' },
      });
      expect(setRecipientStripeCustomerIdMock).toHaveBeenCalledWith('u1', 'cus_fresh');
      expect(createCheckoutSessionMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ customerId: 'cus_fresh' }),
      );
      expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/cs_456' });
    });

    it('does not retry a non-missing-customer Stripe failure even with userId supplied', async () => {
      createCheckoutSessionMock.mockRejectedValue(new Error('Stripe is down'));

      await expect(startOneTimeCheckout({ ...input, userId: 'u1' })).rejects.toMatchObject({ statusCode: 502 });
      expect(createCheckoutSessionMock).toHaveBeenCalledTimes(1);
      expect(createStripeCustomerMock).not.toHaveBeenCalled();
    });

    it('surfaces a 502 if the self-heal retry also fails, without looping further', async () => {
      const missingCustomerError = Object.assign(new Error("No such customer: 'cus_123'"), {
        code: 'resource_missing',
        param: 'customer',
      });
      createCheckoutSessionMock
        .mockRejectedValueOnce(missingCustomerError)
        .mockRejectedValueOnce(new Error('Stripe is down'));
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });
      createStripeCustomerMock.mockResolvedValue({ provider: 'stripe', customerId: 'cus_fresh' });

      await expect(startOneTimeCheckout({ ...input, userId: 'u1' })).rejects.toMatchObject({ statusCode: 502 });
      expect(createCheckoutSessionMock).toHaveBeenCalledTimes(2);
      expect(createPaymentMock).not.toHaveBeenCalled();
    });
  });

  describe('startSubscriptionCheckout', () => {
    const input = {
      customerId: 'cus_123',
      successUrl: 'https://app.example.com/success',
      cancelUrl: 'https://app.example.com/cancel',
    };

    it('returns the checkoutUrl without creating a Payment row', async () => {
      createSubscriptionCheckoutSessionMock.mockResolvedValue({
        provider: 'stripe',
        sessionId: 'cs_456',
        checkoutUrl: 'https://checkout.stripe.com/cs_456',
      });

      const result = await startSubscriptionCheckout(input);

      expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/cs_456' });
      expect(createPaymentMock).not.toHaveBeenCalled();
    });

    it('wraps a Stripe failure as a 502 error', async () => {
      createSubscriptionCheckoutSessionMock.mockRejectedValue(new Error('Stripe is down'));

      await expect(startSubscriptionCheckout(input)).rejects.toMatchObject({ statusCode: 502 });
    });
  });

  describe('setSubscriptionCancelAtPeriodEnd', () => {
    it('delegates to the provider and returns its payload', async () => {
      const providerResult = {
        provider: 'stripe',
        subscriptionId: 'stripe_sub_1',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
        status: 'active',
      };
      updateSubscriptionCancelAtPeriodEndMock.mockResolvedValue(providerResult);

      const result = await setSubscriptionCancelAtPeriodEnd('stripe_sub_1', true);

      expect(updateSubscriptionCancelAtPeriodEndMock).toHaveBeenCalledWith('stripe_sub_1', true);
      expect(result).toEqual(providerResult);
    });

    it('re-wraps a Stripe SDK failure as a 502 error', async () => {
      updateSubscriptionCancelAtPeriodEndMock.mockRejectedValue(new Error('Stripe is down'));

      await expect(setSubscriptionCancelAtPeriodEnd('stripe_sub_1', true)).rejects.toMatchObject({
        statusCode: 502,
      });
    });
  });
});
