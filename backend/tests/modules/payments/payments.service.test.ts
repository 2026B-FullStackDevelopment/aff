import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

const {
  createStripeCustomerMock,
  createCheckoutSessionMock,
  createSubscriptionCheckoutSessionMock,
  updateSubscriptionCancelAtPeriodEndMock,
  createRefundMock,
  createPaymentMock,
  findPaymentBySessionIdMock,
  findPaymentByPayableMock,
  findPaymentByRefundIdMock,
  updatePaymentEventMock,
  markPaymentPaidIfPendingMock,
  markPaymentRefundPendingMock,
  cancelPendingPaymentByPayableMock,
  withTransactionMock,
  findRecipientByUserIdMock,
  getUserByIdMock,
  setRecipientStripeCustomerIdMock,
  markOrderPaidMock,
  markOrderRefundedMock,
  createForOrderMock,
  emitToUserMock,
<<<<<<< HEAD
  appendBillingCycleMock,
  markLatestPastDueMock,
  markLatestCancelledMock,
  sendSubscriptionConfirmationMock,
=======
  sendNotificationMock,
>>>>>>> 39bd5620dcfefd2764b6e72bb2536dd9b8e73809
} = vi.hoisted(() => ({
  createStripeCustomerMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
  createSubscriptionCheckoutSessionMock: vi.fn(),
  updateSubscriptionCancelAtPeriodEndMock: vi.fn(),
  createRefundMock: vi.fn(),
  createPaymentMock: vi.fn(),
  findPaymentBySessionIdMock: vi.fn(),
  findPaymentByPayableMock: vi.fn(),
  findPaymentByRefundIdMock: vi.fn(),
  updatePaymentEventMock: vi.fn(),
  markPaymentPaidIfPendingMock: vi.fn(),
  markPaymentRefundPendingMock: vi.fn(),
  cancelPendingPaymentByPayableMock: vi.fn(),
  withTransactionMock: vi.fn(),
  findRecipientByUserIdMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  setRecipientStripeCustomerIdMock: vi.fn(),
  markOrderPaidMock: vi.fn(),
  markOrderRefundedMock: vi.fn(),
  createForOrderMock: vi.fn(),
  emitToUserMock: vi.fn(),
<<<<<<< HEAD
  appendBillingCycleMock: vi.fn(),
  markLatestPastDueMock: vi.fn(),
  markLatestCancelledMock: vi.fn(),
  sendSubscriptionConfirmationMock: vi.fn(),
=======
  sendNotificationMock: vi.fn(),
>>>>>>> 39bd5620dcfefd2764b6e72bb2536dd9b8e73809
}));

vi.mock('../../../src/integrations/payment/payment.provider.js', () => ({
  createStripeCustomer: createStripeCustomerMock,
  createCheckoutSession: createCheckoutSessionMock,
  createSubscriptionCheckoutSession: createSubscriptionCheckoutSessionMock,
  updateSubscriptionCancelAtPeriodEnd: updateSubscriptionCancelAtPeriodEndMock,
  createRefund: createRefundMock,
}));

vi.mock('../../../src/modules/subscriptions/subscription.interface.js', () => ({
  subscriptionInterface: {
    appendBillingCycle: appendBillingCycleMock,
    markLatestPastDue: markLatestPastDueMock,
    markLatestCancelled: markLatestCancelledMock,
  },
}));

vi.mock('../../../src/integrations/email/email.interface.js', () => ({
  emailInterface: {
    sendSubscriptionConfirmation: sendSubscriptionConfirmationMock,
  },
}));

vi.mock('../../../src/modules/payments/payment.repository.js', () => ({
  createPayment: createPaymentMock,
  findPaymentBySessionId: findPaymentBySessionIdMock,
  findPaymentByPayable: findPaymentByPayableMock,
  findPaymentByRefundId: findPaymentByRefundIdMock,
  updatePaymentEvent: updatePaymentEventMock,
  markPaymentPaidIfPending: markPaymentPaidIfPendingMock,
  markPaymentRefundPending: markPaymentRefundPendingMock,
  cancelPendingPaymentByPayable: cancelPendingPaymentByPayableMock,
  withTransaction: withTransactionMock,
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    findRecipientByUserId: findRecipientByUserIdMock,
    getUserById: getUserByIdMock,
    setRecipientStripeCustomerId: setRecipientStripeCustomerIdMock,
  },
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    markOrderPaid: markOrderPaidMock,
    markOrderRefunded: markOrderRefundedMock,
  },
}));

vi.mock('../../../src/modules/delivery/delivery.interface.js', () => ({
  deliveryInterface: {
    createForOrder: createForOrderMock,
  },
}));

vi.mock('../../../src/realtime/socket.js', () => ({
  emitToUser: emitToUserMock,
}));

vi.mock('../../../src/modules/notifications/notification.interface.js', () => ({
  notificationInterface: {
    sendNotification: sendNotificationMock,
  },
}));

import {
  getOrCreateStripeCustomer,
  startOneTimeCheckout,
  startSubscriptionCheckout,
  setSubscriptionCancelAtPeriodEnd,
  refundOrderPayment,
  cancelPendingOrderPayment,
  processWebhookEvent,
} from '../../../src/modules/payments/payments.service.js';

function checkoutSessionCompletedEvent(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_123', mode: 'payment', ...overrides } },
  } as unknown as Stripe.Event;
}

function invoicePaidEvent(overrides: Record<string, unknown> = {}, eventId = 'evt_5') {
  return {
    id: eventId,
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_123',
        customer: 'cus_123',
        parent: { subscription_details: { subscription: 'stripe_sub_1' } },
        period_end: 1780000000,
        lines: { data: [{ period: { end: 1780000000 } }] },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

function invoicePaymentFailedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_6',
    type: 'invoice.payment_failed',
    data: { object: { id: 'in_456', customer: 'cus_123', ...overrides } },
  } as unknown as Stripe.Event;
}

function subscriptionDeletedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_7',
    type: 'customer.subscription.deleted',
    data: { object: { id: 'stripe_sub_1', customer: 'cus_123', ...overrides } },
  } as unknown as Stripe.Event;
}

function chargeRefundedEvent(overrides: Partial<Stripe.Charge> = {}, eventId = 'evt_9') {
  return {
    id: eventId,
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_123',
        refunds: { data: [{ id: 're_123' }] },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

describe('payments.service', () => {
  const databaseSession = { id: 'database-session' };

  beforeEach(() => {
    createStripeCustomerMock.mockReset();
    createCheckoutSessionMock.mockReset();
    createSubscriptionCheckoutSessionMock.mockReset();
    createRefundMock.mockReset();
    createPaymentMock.mockReset();
    findPaymentBySessionIdMock.mockReset();
    findPaymentByPayableMock.mockReset();
    findPaymentByRefundIdMock.mockReset();
    updatePaymentEventMock.mockReset();
    markPaymentPaidIfPendingMock.mockReset();
    markPaymentRefundPendingMock.mockReset();
    cancelPendingPaymentByPayableMock.mockReset();
    withTransactionMock.mockReset();
    findRecipientByUserIdMock.mockReset();
    getUserByIdMock.mockReset();
    setRecipientStripeCustomerIdMock.mockReset();
    markOrderPaidMock.mockReset();
    markOrderRefundedMock.mockReset();
    createForOrderMock.mockReset();
    emitToUserMock.mockReset();
<<<<<<< HEAD
    updateSubscriptionCancelAtPeriodEndMock.mockReset();
    appendBillingCycleMock.mockReset();
    markLatestPastDueMock.mockReset();
    markLatestCancelledMock.mockReset();
    sendSubscriptionConfirmationMock.mockReset();
=======
    sendNotificationMock.mockReset();
>>>>>>> 39bd5620dcfefd2764b6e72bb2536dd9b8e73809

    withTransactionMock.mockImplementation(
      async (operation) => operation(databaseSession),
    );
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

  describe('refundOrderPayment', () => {
    it('refunds a PAID payment and marks it REFUND_PENDING with the returned stripeRefundId', async () => {
      findPaymentByPayableMock.mockResolvedValue({
        _id: 'p1',
        status: 'PAID',
        stripePaymentIntentId: 'pi_123',
      });
      createRefundMock.mockResolvedValue({ provider: 'stripe', refundId: 're_123', status: 'succeeded' });

      const result = await refundOrderPayment('o1');

      expect(findPaymentByPayableMock).toHaveBeenCalledWith('ORDER', 'o1');
      expect(createRefundMock).toHaveBeenCalledWith({ paymentIntentId: 'pi_123' });
      expect(markPaymentRefundPendingMock).toHaveBeenCalledWith('p1', 're_123');
      expect(result).toEqual({ status: 'REFUND_PENDING', refundId: 're_123' });
    });

    it('is idempotent: a payment already REFUND_PENDING is not refunded again', async () => {
      findPaymentByPayableMock.mockResolvedValue({
        _id: 'p1',
        status: 'REFUND_PENDING',
        stripeRefundId: 're_existing',
      });

      const result = await refundOrderPayment('o1');

      expect(createRefundMock).not.toHaveBeenCalled();
      expect(markPaymentRefundPendingMock).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'REFUND_PENDING', refundId: 're_existing' });
    });

    it('is idempotent: a payment already REFUNDED is not refunded again', async () => {
      findPaymentByPayableMock.mockResolvedValue({
        _id: 'p1',
        status: 'REFUNDED',
        stripeRefundId: 're_existing',
      });

      const result = await refundOrderPayment('o1');

      expect(createRefundMock).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'REFUNDED', refundId: 're_existing' });
    });

    it('throws a 404 when no Payment row exists for the order', async () => {
      findPaymentByPayableMock.mockResolvedValue(null);

      await expect(refundOrderPayment('o1')).rejects.toMatchObject({ statusCode: 404 });
      expect(createRefundMock).not.toHaveBeenCalled();
    });

    it('throws a 502 when the payment has no stripePaymentIntentId', async () => {
      findPaymentByPayableMock.mockResolvedValue({ _id: 'p1', status: 'PAID', stripePaymentIntentId: undefined });

      await expect(refundOrderPayment('o1')).rejects.toMatchObject({ statusCode: 502 });
      expect(createRefundMock).not.toHaveBeenCalled();
    });

    it('wraps a Stripe refund failure as a 502 error and does not mark the payment', async () => {
      findPaymentByPayableMock.mockResolvedValue({
        _id: 'p1',
        status: 'PAID',
        stripePaymentIntentId: 'pi_123',
      });
      createRefundMock.mockRejectedValue(new Error('Stripe is down'));

      await expect(refundOrderPayment('o1')).rejects.toMatchObject({ statusCode: 502 });
      expect(markPaymentRefundPendingMock).not.toHaveBeenCalled();
    });
  });

  describe('cancelPendingOrderPayment', () => {
    it('delegates to paymentRepository.cancelPendingPaymentByPayable for the ORDER payable', async () => {
      cancelPendingPaymentByPayableMock.mockResolvedValue({ _id: 'p1', status: 'CANCELLED' });

      const result = await cancelPendingOrderPayment('o1', databaseSession as never);

      expect(cancelPendingPaymentByPayableMock).toHaveBeenCalledWith('ORDER', 'o1', databaseSession);
      expect(result).toEqual({ _id: 'p1', status: 'CANCELLED' });
    });
  });

  describe('processWebhookEvent', () => {
    function prepareSuccessfulOrderPayment() {
      findPaymentBySessionIdMock.mockResolvedValue({
        _id: 'p1',
        payableType: 'ORDER',
        payableId: 'o1',
        status: 'PENDING',
      });
      markPaymentPaidIfPendingMock.mockResolvedValue({
        _id: 'p1',
        payableType: 'ORDER',
        payableId: 'o1',
        status: 'PAID',
      });
      markOrderPaidMock.mockResolvedValue({
        _id: 'o1',
        recipientId: 'r1',
        paymentStatus: 'PAID',
        orderStatus: 'PREPARING',
      });
      createForOrderMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
      });
    }

    it('atomically completes the Payment and Order, creates a Delivery, and emits success', async () => {
      prepareSuccessfulOrderPayment();

      await processWebhookEvent(checkoutSessionCompletedEvent());

      expect(findPaymentBySessionIdMock).toHaveBeenCalledWith(
        'cs_123',
        databaseSession,
      );
      expect(markPaymentPaidIfPendingMock).toHaveBeenCalledWith(
        'cs_123',
        'evt_1',
        expect.any(Date),
        databaseSession,
        undefined,
      );
      expect(markOrderPaidMock).toHaveBeenCalledWith(
        'o1',
        databaseSession,
      );
      expect(createForOrderMock).toHaveBeenCalledWith(
        'o1',
        databaseSession,
      );
      expect(sendNotificationMock).toHaveBeenCalledTimes(1);
      expect(sendNotificationMock).toHaveBeenCalledWith({
        userId: 'r1',
        type: 'PAYMENT_SUCCESS',
        orderId: 'o1',
        payload: { orderId: 'o1' },
      });
    });

    it('captures stripePaymentIntentId from the session when present', async () => {
      prepareSuccessfulOrderPayment();

      await processWebhookEvent(checkoutSessionCompletedEvent({ payment_intent: 'pi_123' } as never));

      expect(markPaymentPaidIfPendingMock).toHaveBeenCalledWith(
        'cs_123',
        'evt_1',
        expect.any(Date),
        databaseSession,
        'pi_123',
      );
    });

    it('skips an already-paid Payment without duplicating Delivery or event work', async () => {
      findPaymentBySessionIdMock.mockResolvedValue({
        _id: 'p1',
        payableType: 'ORDER',
        payableId: 'o1',
        status: 'PAID',
      });

      await processWebhookEvent(checkoutSessionCompletedEvent());

      expect(markPaymentPaidIfPendingMock).not.toHaveBeenCalled();
      expect(markOrderPaidMock).not.toHaveBeenCalled();
      expect(createForOrderMock).not.toHaveBeenCalled();
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('no-ops when no Payment row matches the session', async () => {
      findPaymentBySessionIdMock.mockResolvedValue(null);

      await expect(processWebhookEvent(checkoutSessionCompletedEvent())).resolves.toBeUndefined();
      expect(markPaymentPaidIfPendingMock).not.toHaveBeenCalled();
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('creates nothing for a subscription-mode checkout.session.completed event (the row is appended by invoice.paid)', async () => {
      await processWebhookEvent(checkoutSessionCompletedEvent({ mode: 'subscription' }));

      expect(findPaymentBySessionIdMock).not.toHaveBeenCalled();
      expect(markPaymentPaidIfPendingMock).not.toHaveBeenCalled();
      expect(appendBillingCycleMock).not.toHaveBeenCalled();
    });

    describe('invoice.paid (F1)', () => {
      it('appends a billing cycle with the converted period end and sends the confirmation email when a row is newly created', async () => {
        appendBillingCycleMock.mockResolvedValue({
          created: true,
          recipientEmail: 'jane@example.com',
          currentPeriodEnd: new Date(1780000000 * 1000),
        });

        await processWebhookEvent(invoicePaidEvent());

        expect(appendBillingCycleMock).toHaveBeenCalledWith({
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'stripe_sub_1',
          stripeInvoiceId: 'in_123',
          currentPeriodEnd: new Date(1780000000 * 1000),
          cancelAtPeriodEnd: false,
        });
        expect(sendSubscriptionConfirmationMock).toHaveBeenCalledWith({
          to: 'jane@example.com',
          currentPeriodEnd: new Date(1780000000 * 1000),
        });
      });

      it('falls back to invoice.period_end when a line item has no period (still converts to a Date)', async () => {
        appendBillingCycleMock.mockResolvedValue({ created: false });

        await processWebhookEvent(invoicePaidEvent({ lines: { data: [] }, period_end: 1790000000 }));

        expect(appendBillingCycleMock).toHaveBeenCalledWith(
          expect.objectContaining({ currentPeriodEnd: new Date(1790000000 * 1000) }),
        );
      });

      it('resolves an expanded (object) customer/subscription reference to its plain id', async () => {
        appendBillingCycleMock.mockResolvedValue({ created: false });

        await processWebhookEvent(
          invoicePaidEvent({
            customer: { id: 'cus_expanded' },
            parent: { subscription_details: { subscription: { id: 'stripe_sub_expanded' } } },
          }),
        );

        expect(appendBillingCycleMock).toHaveBeenCalledWith(
          expect.objectContaining({
            stripeCustomerId: 'cus_expanded',
            stripeSubscriptionId: 'stripe_sub_expanded',
          }),
        );
      });

      it('is idempotent: a duplicate invoice.paid sends no second confirmation email', async () => {
        appendBillingCycleMock.mockResolvedValue({ created: false });

        await processWebhookEvent(invoicePaidEvent());

        expect(sendSubscriptionConfirmationMock).not.toHaveBeenCalled();
      });
    });

    it('invoice.payment_failed marks the latest subscription PAST_DUE for the resolved customer', async () => {
      await processWebhookEvent(invoicePaymentFailedEvent());

      expect(markLatestPastDueMock).toHaveBeenCalledWith('cus_123');
    });

    it('customer.subscription.deleted marks the latest subscription CANCELLED for the resolved customer', async () => {
      await processWebhookEvent(subscriptionDeletedEvent());

      expect(markLatestCancelledMock).toHaveBeenCalledWith('cus_123');
    });

    it('marks the matching Payment REFUNDED, flips the Order, and emits payment:refunded (D4)', async () => {
      findPaymentByRefundIdMock.mockResolvedValue({
        _id: 'p1',
        payableType: 'ORDER',
        payableId: 'o1',
        lastProcessedEventId: undefined,
      });
      markOrderRefundedMock.mockResolvedValue({
        _id: 'o1',
        recipientId: 'r1',
        paymentStatus: 'REFUNDED',
      });

      await processWebhookEvent(chargeRefundedEvent());

      expect(findPaymentByRefundIdMock).toHaveBeenCalledWith('re_123');
      expect(updatePaymentEventMock).toHaveBeenCalledWith('p1', {
        lastProcessedEventId: 'evt_9',
        status: 'REFUNDED',
        refundedAt: expect.any(Date),
      });
      expect(markOrderRefundedMock).toHaveBeenCalledWith('o1');
      expect(sendNotificationMock).toHaveBeenCalledWith({
        userId: 'r1',
        type: 'PAYMENT_REFUNDED',
        orderId: 'o1',
        payload: { orderId: 'o1' },
      });
    });

    it('skips already-processed charge.refunded events (idempotency)', async () => {
      findPaymentByRefundIdMock.mockResolvedValue({ _id: 'p1', lastProcessedEventId: 'evt_9' });

      await processWebhookEvent(chargeRefundedEvent());

      expect(updatePaymentEventMock).not.toHaveBeenCalled();
      expect(markOrderRefundedMock).not.toHaveBeenCalled();
    });

    it('does not flip an Order or emit for a non-ORDER payable (e.g. a subscription payment)', async () => {
      findPaymentByRefundIdMock.mockResolvedValue({
        _id: 'p1',
        payableType: 'SUBSCRIPTIONS',
        payableId: 's1',
        lastProcessedEventId: undefined,
      });

      await processWebhookEvent(chargeRefundedEvent());

      expect(updatePaymentEventMock).toHaveBeenCalled();
      expect(markOrderRefundedMock).not.toHaveBeenCalled();
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('does not emit payment:refunded when the Order was not in REFUND_PENDING (race)', async () => {
      findPaymentByRefundIdMock.mockResolvedValue({
        _id: 'p1',
        payableType: 'ORDER',
        payableId: 'o1',
        lastProcessedEventId: undefined,
      });
      markOrderRefundedMock.mockResolvedValue(null);

      await processWebhookEvent(chargeRefundedEvent());

      expect(markOrderRefundedMock).toHaveBeenCalledWith('o1');
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('no-ops when no Payment row matches the refund id', async () => {
      findPaymentByRefundIdMock.mockResolvedValue(null);

      await expect(processWebhookEvent(chargeRefundedEvent())).resolves.toBeUndefined();
      expect(updatePaymentEventMock).not.toHaveBeenCalled();
    });

    it('no-ops on a charge.refunded event with no refunds on the charge', async () => {
      await expect(
        processWebhookEvent(chargeRefundedEvent({ refunds: { data: [] } } as never)),
      ).resolves.toBeUndefined();
      expect(findPaymentByRefundIdMock).not.toHaveBeenCalled();
    });

    it('no-ops on an undocumented event type', async () => {
      const event = { id: 'evt_3', type: 'account.updated', data: { object: {} } } as unknown as Stripe.Event;

      await expect(processWebhookEvent(event)).resolves.toBeUndefined();
    });
  });
});
