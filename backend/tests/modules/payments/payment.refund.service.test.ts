import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

const {
  createRefundMock,
  findPaymentByPayableMock,
  findPaymentByRefundIdMock,
  updatePaymentEventMock,
  markPaymentRefundPendingMock,
  cancelPendingPaymentByPayableMock,
  markOrderRefundedMock,
  sendNotificationMock,
} = vi.hoisted(() => ({
  createRefundMock: vi.fn(),
  findPaymentByPayableMock: vi.fn(),
  findPaymentByRefundIdMock: vi.fn(),
  updatePaymentEventMock: vi.fn(),
  markPaymentRefundPendingMock: vi.fn(),
  cancelPendingPaymentByPayableMock: vi.fn(),
  markOrderRefundedMock: vi.fn(),
  sendNotificationMock: vi.fn(),
}));

vi.mock('../../../src/integrations/payment/payment.provider.js', () => ({
  createRefund: createRefundMock,
}));

vi.mock('../../../src/modules/payments/payment.repository.js', () => ({
  findPaymentByPayable: findPaymentByPayableMock,
  findPaymentByRefundId: findPaymentByRefundIdMock,
  updatePaymentEvent: updatePaymentEventMock,
  markPaymentRefundPending: markPaymentRefundPendingMock,
  cancelPendingPaymentByPayable: cancelPendingPaymentByPayableMock,
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    markOrderRefunded: markOrderRefundedMock,
  },
}));

vi.mock('../../../src/modules/notifications/notification.interface.js', () => ({
  notificationInterface: {
    sendNotification: sendNotificationMock,
  },
}));

import {
  refundOrderPayment,
  cancelPendingOrderPayment,
  handleRefundUpdated,
} from '../../../src/modules/payments/payment.refund.service.js';

function refundUpdatedPayload(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    id: 're_123',
    status: 'succeeded',
    ...overrides,
  } as unknown as Stripe.Refund;
}

describe('payment.refund.service', () => {
  const databaseSession = { id: 'database-session' };

  beforeEach(() => {
    createRefundMock.mockReset();
    findPaymentByPayableMock.mockReset();
    findPaymentByRefundIdMock.mockReset();
    updatePaymentEventMock.mockReset();
    markPaymentRefundPendingMock.mockReset();
    cancelPendingPaymentByPayableMock.mockReset();
    markOrderRefundedMock.mockReset();
    sendNotificationMock.mockReset();
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

  describe('handleRefundUpdated', () => {
    it('marks the matching Payment REFUNDED, flips the Order, and notifies (D4)', async () => {
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

      await handleRefundUpdated(refundUpdatedPayload(), 'evt_9');

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

    it('skips already-processed refund.updated events (idempotency)', async () => {
      findPaymentByRefundIdMock.mockResolvedValue({ _id: 'p1', lastProcessedEventId: 'evt_9' });

      await handleRefundUpdated(refundUpdatedPayload(), 'evt_9');

      expect(updatePaymentEventMock).not.toHaveBeenCalled();
      expect(markOrderRefundedMock).not.toHaveBeenCalled();
    });

    it('does not flip an Order or notify for a non-ORDER payable (e.g. a subscription payment)', async () => {
      findPaymentByRefundIdMock.mockResolvedValue({
        _id: 'p1',
        payableType: 'SUBSCRIPTIONS',
        payableId: 's1',
        lastProcessedEventId: undefined,
      });

      await handleRefundUpdated(refundUpdatedPayload(), 'evt_9');

      expect(updatePaymentEventMock).toHaveBeenCalled();
      expect(markOrderRefundedMock).not.toHaveBeenCalled();
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('does not notify when the Order was not in REFUND_PENDING (race)', async () => {
      findPaymentByRefundIdMock.mockResolvedValue({
        _id: 'p1',
        payableType: 'ORDER',
        payableId: 'o1',
        lastProcessedEventId: undefined,
      });
      markOrderRefundedMock.mockResolvedValue(null);

      await handleRefundUpdated(refundUpdatedPayload(), 'evt_9');

      expect(markOrderRefundedMock).toHaveBeenCalledWith('o1');
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('no-ops when no Payment row matches the refund id', async () => {
      findPaymentByRefundIdMock.mockResolvedValue(null);

      await expect(handleRefundUpdated(refundUpdatedPayload(), 'evt_9')).resolves.toBeUndefined();
      expect(updatePaymentEventMock).not.toHaveBeenCalled();
    });

    it.each(['pending', 'failed', 'canceled'] as const)(
      'no-ops on a refund.updated event whose status is not yet succeeded (%s)',
      async (status) => {
        await expect(
          handleRefundUpdated(refundUpdatedPayload({ status }), 'evt_9'),
        ).resolves.toBeUndefined();
        expect(findPaymentByRefundIdMock).not.toHaveBeenCalled();
      },
    );
  });
});
