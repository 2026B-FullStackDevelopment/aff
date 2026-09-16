import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

const {
  findPaymentBySessionIdMock,
  markPaymentPaidIfPendingMock,
  withTransactionMock,
  findRecipientByUserIdMock,
  markOrderPaidMock,
  createForOrderMock,
  appendBillingCycleMock,
  markLatestPastDueMock,
  markLatestCancelledMock,
  sendSubscriptionConfirmationMock,
  sendNotificationMock,
  handleRefundUpdatedMock,
} = vi.hoisted(() => ({
  findPaymentBySessionIdMock: vi.fn(),
  markPaymentPaidIfPendingMock: vi.fn(),
  withTransactionMock: vi.fn(),
  findRecipientByUserIdMock: vi.fn(),
  markOrderPaidMock: vi.fn(),
  createForOrderMock: vi.fn(),
  appendBillingCycleMock: vi.fn(),
  markLatestPastDueMock: vi.fn(),
  markLatestCancelledMock: vi.fn(),
  sendSubscriptionConfirmationMock: vi.fn(),
  sendNotificationMock: vi.fn(),
  handleRefundUpdatedMock: vi.fn(),
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
  findPaymentBySessionId: findPaymentBySessionIdMock,
  markPaymentPaidIfPending: markPaymentPaidIfPendingMock,
  withTransaction: withTransactionMock,
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    markOrderPaid: markOrderPaidMock,
  },
}));

vi.mock('../../../src/modules/delivery/delivery.interface.js', () => ({
  deliveryInterface: {
    createForOrder: createForOrderMock,
  },
}));

vi.mock('../../../src/modules/notifications/notification.interface.js', () => ({
  notificationInterface: {
    sendNotification: sendNotificationMock,
  },
}));

vi.mock('../../../src/modules/payments/payment.refund.service.js', () => ({
  handleRefundUpdated: handleRefundUpdatedMock,
}));

import {
  processWebhookEvent,
} from '../../../src/modules/payments/payment.webhook.service.js';

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

function refundUpdatedEvent(overrides: Partial<Stripe.Refund> = {}, eventId = 'evt_9') {
  return {
    id: eventId,
    type: 'refund.updated',
    data: {
      object: {
        id: 're_123',
        status: 'succeeded',
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

describe('payment.webhook.service', () => {
  const databaseSession = { id: 'database-session' };

  beforeEach(() => {
    findPaymentBySessionIdMock.mockReset();
    markPaymentPaidIfPendingMock.mockReset();
    withTransactionMock.mockReset();
    findRecipientByUserIdMock.mockReset();
    markOrderPaidMock.mockReset();
    createForOrderMock.mockReset();
    appendBillingCycleMock.mockReset();
    markLatestPastDueMock.mockReset();
    markLatestCancelledMock.mockReset();
    sendSubscriptionConfirmationMock.mockReset();
    sendNotificationMock.mockReset();
    handleRefundUpdatedMock.mockReset();

    withTransactionMock.mockImplementation(
      async (operation) => operation(databaseSession),
    );
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

      it('does not throw when the confirmation email fails to send — the ledger row is already committed', async () => {
        appendBillingCycleMock.mockResolvedValue({
          created: true,
          recipientEmail: 'jane@example.com',
          currentPeriodEnd: new Date(1780000000 * 1000),
        });
        sendSubscriptionConfirmationMock.mockRejectedValue(new Error('SMTP is down'));

        await expect(processWebhookEvent(invoicePaidEvent())).resolves.toBeUndefined();
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

    it('routes a refund.updated event to handleRefundUpdated with the refund payload and event id', async () => {
      await processWebhookEvent(refundUpdatedEvent());

      expect(handleRefundUpdatedMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 're_123', status: 'succeeded' }),
        'evt_9',
      );
    });

    it('no-ops on an undocumented event type', async () => {
      const event = { id: 'evt_3', type: 'account.updated', data: { object: {} } } as unknown as Stripe.Event;

      await expect(processWebhookEvent(event)).resolves.toBeUndefined();
    });
  });
});
