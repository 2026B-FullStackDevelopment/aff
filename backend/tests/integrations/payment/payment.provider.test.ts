import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  customersCreateMock,
  checkoutSessionsCreateMock,
  webhooksConstructEventMock,
  refundsCreateMock,
  subscriptionsUpdateMock,
  StripeCtorMock,
} = vi.hoisted(() => {
  const customersCreateMock = vi.fn();
  const checkoutSessionsCreateMock = vi.fn();
  const webhooksConstructEventMock = vi.fn();
  const refundsCreateMock = vi.fn();
  const subscriptionsUpdateMock = vi.fn();
  const StripeCtorMock = vi.fn(function StripeMock() {
    return {
      customers: { create: customersCreateMock },
      checkout: { sessions: { create: checkoutSessionsCreateMock } },
      webhooks: { constructEvent: webhooksConstructEventMock },
      refunds: { create: refundsCreateMock },
      subscriptions: { update: subscriptionsUpdateMock },
    };
  });
  return {
    customersCreateMock,
    checkoutSessionsCreateMock,
    webhooksConstructEventMock,
    refundsCreateMock,
    subscriptionsUpdateMock,
    StripeCtorMock,
  };
});

vi.mock('stripe', () => ({ default: StripeCtorMock }));

vi.mock('../../../src/config/env.js', () => ({
  env: { stripeSecretKey: 'sk_test_123', stripeWebhookSecret: 'whsec_123' },
}));

import {
  createStripeCustomer,
  createCheckoutSession,
  createSubscriptionCheckoutSession,
  updateSubscriptionCancelAtPeriodEnd,
  createRefund,
  verifyWebhookSignature,
} from '../../../src/integrations/payment/payment.provider.js';

describe('payment.provider', () => {
  beforeEach(() => {
    customersCreateMock.mockReset();
    checkoutSessionsCreateMock.mockReset();
    webhooksConstructEventMock.mockReset();
    refundsCreateMock.mockReset();
    subscriptionsUpdateMock.mockReset();
  });

  describe('createStripeCustomer', () => {
    it('creates a Stripe customer and returns its id', async () => {
      customersCreateMock.mockResolvedValue({ id: 'cus_123' });

      const result = await createStripeCustomer({ email: 'jane@example.com', metadata: { userId: 'u1' } });

      expect(customersCreateMock).toHaveBeenCalledWith({ email: 'jane@example.com', metadata: { userId: 'u1' } });
      expect(result).toEqual({ provider: 'stripe', customerId: 'cus_123' });
    });
  });

  describe('createCheckoutSession', () => {
    it('creates a one-off payment-mode checkout session with the given amount/currency', async () => {
      checkoutSessionsCreateMock.mockResolvedValue({ id: 'cs_123', url: 'https://checkout.stripe.com/cs_123' });

      const result = await createCheckoutSession({
        customerId: 'cus_123',
        amount: 5000,
        currency: 'usd',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        metadata: { payableType: 'ORDER', payableId: 'o1' },
      });

      expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          customer: 'cus_123',
          success_url: 'https://app.example.com/success',
          cancel_url: 'https://app.example.com/cancel',
          metadata: { payableType: 'ORDER', payableId: 'o1' },
          line_items: [
            expect.objectContaining({
              quantity: 1,
              price_data: expect.objectContaining({ currency: 'usd', unit_amount: 5000 }),
            }),
          ],
        }),
      );
      expect(result).toEqual({ provider: 'stripe', sessionId: 'cs_123', checkoutUrl: 'https://checkout.stripe.com/cs_123' });
    });
  });

  describe('createSubscriptionCheckoutSession', () => {
    it('creates a subscription-mode checkout session for the fixed $5/month price', async () => {
      checkoutSessionsCreateMock.mockResolvedValue({ id: 'cs_456', url: 'https://checkout.stripe.com/cs_456' });

      const result = await createSubscriptionCheckoutSession({
        customerId: 'cus_123',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        metadata: { userId: 'u1' },
      });

      expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          customer: 'cus_123',
          line_items: [
            expect.objectContaining({
              quantity: 1,
              price_data: expect.objectContaining({
                currency: 'usd',
                unit_amount: 500,
                recurring: { interval: 'month' },
              }),
            }),
          ],
        }),
      );
      expect(result).toEqual({ provider: 'stripe', sessionId: 'cs_456', checkoutUrl: 'https://checkout.stripe.com/cs_456' });
    });
  });

  describe('updateSubscriptionCancelAtPeriodEnd', () => {
    it('calls subscriptions.update with cancel_at_period_end and maps the response', async () => {
      subscriptionsUpdateMock.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: true,
        status: 'active',
        items: { data: [{ current_period_end: 1780000000 }] },
      });

      const result = await updateSubscriptionCancelAtPeriodEnd('sub_123', true);

      expect(subscriptionsUpdateMock).toHaveBeenCalledWith('sub_123', { cancel_at_period_end: true });
      expect(result).toEqual({
        provider: 'stripe',
        subscriptionId: 'sub_123',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date(1780000000 * 1000),
        status: 'active',
      });
    });

    it('passes cancel_at_period_end: false for the resume direction', async () => {
      subscriptionsUpdateMock.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: false,
        status: 'active',
        items: { data: [{ current_period_end: 1780000000 }] },
      });

      await updateSubscriptionCancelAtPeriodEnd('sub_123', false);

      expect(subscriptionsUpdateMock).toHaveBeenCalledWith('sub_123', { cancel_at_period_end: false });
    });

    it('falls back to a null currentPeriodEnd when the subscription has no items', async () => {
      subscriptionsUpdateMock.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: true,
        status: 'active',
        items: { data: [] },
      });

      const result = await updateSubscriptionCancelAtPeriodEnd('sub_123', true);

      expect(result.currentPeriodEnd).toBeNull();
    });
  });

  describe('createRefund', () => {
    it('refunds the given payment intent and returns the refund id/status', async () => {
      refundsCreateMock.mockResolvedValue({ id: 're_123', status: 'succeeded' });

      const result = await createRefund({ paymentIntentId: 'pi_123' });

      expect(refundsCreateMock).toHaveBeenCalledWith({ payment_intent: 'pi_123' });
      expect(result).toEqual({ provider: 'stripe', refundId: 're_123', status: 'succeeded' });
    });
  });

  describe('verifyWebhookSignature', () => {
    it('returns the constructed event when the signature is valid', () => {
      const fakeEvent = { id: 'evt_1', type: 'checkout.session.completed' };
      webhooksConstructEventMock.mockReturnValue(fakeEvent);

      const rawBody = Buffer.from('{}');
      const result = verifyWebhookSignature(rawBody, 'sig_header');

      expect(webhooksConstructEventMock).toHaveBeenCalledWith(rawBody, 'sig_header', 'whsec_123');
      expect(result).toBe(fakeEvent);
    });

    it('wraps a signature verification failure as a 400 error', () => {
      webhooksConstructEventMock.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      expect(() => verifyWebhookSignature(Buffer.from('{}'), 'bad_sig')).toThrow(
        /No signatures found/,
      );

      try {
        verifyWebhookSignature(Buffer.from('{}'), 'bad_sig');
      } catch (error) {
        expect((error as Error).statusCode).toBe(400);
      }
    });
  });
});
