import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

const {
  createStripeCustomerMock,
  createCheckoutSessionMock,
  createSubscriptionCheckoutSessionMock,
  createPaymentMock,
  findPaymentBySessionIdMock,
  updatePaymentEventMock,
  findRecipientByUserIdMock,
  getUserByIdMock,
  setRecipientStripeCustomerIdMock,
} = vi.hoisted(() => ({
  createStripeCustomerMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
  createSubscriptionCheckoutSessionMock: vi.fn(),
  createPaymentMock: vi.fn(),
  findPaymentBySessionIdMock: vi.fn(),
  updatePaymentEventMock: vi.fn(),
  findRecipientByUserIdMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  setRecipientStripeCustomerIdMock: vi.fn(),
}));

vi.mock('../../../src/integrations/payment/payment.provider.js', () => ({
  createStripeCustomer: createStripeCustomerMock,
  createCheckoutSession: createCheckoutSessionMock,
  createSubscriptionCheckoutSession: createSubscriptionCheckoutSessionMock,
}));

vi.mock('../../../src/modules/payments/payment.repository.js', () => ({
  createPayment: createPaymentMock,
  findPaymentBySessionId: findPaymentBySessionIdMock,
  updatePaymentEvent: updatePaymentEventMock,
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    findRecipientByUserId: findRecipientByUserIdMock,
    getUserById: getUserByIdMock,
    setRecipientStripeCustomerId: setRecipientStripeCustomerIdMock,
  },
}));

import {
  getOrCreateStripeCustomer,
  startOneTimeCheckout,
  startSubscriptionCheckout,
  processWebhookEvent,
} from '../../../src/modules/payments/payments.service.js';

function checkoutSessionCompletedEvent(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_123', mode: 'payment', ...overrides } },
  } as unknown as Stripe.Event;
}

describe('payments.service', () => {
  beforeEach(() => {
    createStripeCustomerMock.mockReset();
    createCheckoutSessionMock.mockReset();
    createSubscriptionCheckoutSessionMock.mockReset();
    createPaymentMock.mockReset();
    findPaymentBySessionIdMock.mockReset();
    updatePaymentEventMock.mockReset();
    findRecipientByUserIdMock.mockReset();
    getUserByIdMock.mockReset();
    setRecipientStripeCustomerIdMock.mockReset();
  });

  describe('getOrCreateStripeCustomer', () => {
    it('returns the existing stripeCustomerId without calling Stripe', async () => {
      findRecipientByUserIdMock.mockResolvedValue({ userId: 'u1', stripeCustomerId: 'cus_existing' });

      const result = await getOrCreateStripeCustomer('u1');

      expect(result).toBe('cus_existing');
      expect(createStripeCustomerMock).not.toHaveBeenCalled();
    });

    it('throws a 404 when no Recipient profile exists', async () => {
      findRecipientByUserIdMock.mockResolvedValue(null);

      await expect(getOrCreateStripeCustomer('u1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('creates a Stripe customer and persists it when none exists yet', async () => {
      findRecipientByUserIdMock.mockResolvedValue({ userId: 'u1', stripeCustomerId: null });
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });
      createStripeCustomerMock.mockResolvedValue({ provider: 'stripe', customerId: 'cus_new' });

      const result = await getOrCreateStripeCustomer('u1');

      expect(createStripeCustomerMock).toHaveBeenCalledWith({
        email: 'jane@example.com',
        metadata: { userId: 'u1' },
      });
      expect(setRecipientStripeCustomerIdMock).toHaveBeenCalledWith('u1', 'cus_new');
      expect(result).toBe('cus_new');
    });

    it('wraps a Stripe failure as a 502 error', async () => {
      findRecipientByUserIdMock.mockResolvedValue({ userId: 'u1', stripeCustomerId: null });
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });
      createStripeCustomerMock.mockRejectedValue(new Error('Stripe is down'));

      await expect(getOrCreateStripeCustomer('u1')).rejects.toMatchObject({ statusCode: 502 });
      expect(setRecipientStripeCustomerIdMock).not.toHaveBeenCalled();
    });
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

  describe('processWebhookEvent', () => {
    it('marks the matching Payment PAID on a fresh payment-mode checkout.session.completed event', async () => {
      findPaymentBySessionIdMock.mockResolvedValue({ _id: 'p1', lastProcessedEventId: undefined });

      await processWebhookEvent(checkoutSessionCompletedEvent());

      expect(findPaymentBySessionIdMock).toHaveBeenCalledWith('cs_123');
      expect(updatePaymentEventMock).toHaveBeenCalledWith('p1', {
        lastProcessedEventId: 'evt_1',
        status: 'PAID',
        paidAt: expect.any(Date),
      });
    });

    it('skips already-processed events (idempotency)', async () => {
      findPaymentBySessionIdMock.mockResolvedValue({ _id: 'p1', lastProcessedEventId: 'evt_1' });

      await processWebhookEvent(checkoutSessionCompletedEvent());

      expect(updatePaymentEventMock).not.toHaveBeenCalled();
    });

    it('no-ops when no Payment row matches the session', async () => {
      findPaymentBySessionIdMock.mockResolvedValue(null);

      await expect(processWebhookEvent(checkoutSessionCompletedEvent())).resolves.toBeUndefined();
      expect(updatePaymentEventMock).not.toHaveBeenCalled();
    });

    it('no-ops on a subscription-mode checkout.session.completed event (F1 stub)', async () => {
      await processWebhookEvent(checkoutSessionCompletedEvent({ mode: 'subscription' }));

      expect(findPaymentBySessionIdMock).not.toHaveBeenCalled();
      expect(updatePaymentEventMock).not.toHaveBeenCalled();
    });

    it.each(['invoice.paid', 'invoice.payment_failed', 'customer.subscription.deleted'])(
      'no-ops on %s (F1 stub)',
      async (type) => {
        const event = { id: 'evt_2', type, data: { object: {} } } as unknown as Stripe.Event;

        await expect(processWebhookEvent(event)).resolves.toBeUndefined();
        expect(findPaymentBySessionIdMock).not.toHaveBeenCalled();
        expect(updatePaymentEventMock).not.toHaveBeenCalled();
      },
    );

    it('no-ops on an undocumented event type', async () => {
      const event = { id: 'evt_3', type: 'account.updated', data: { object: {} } } as unknown as Stripe.Event;

      await expect(processWebhookEvent(event)).resolves.toBeUndefined();
    });
  });
});
