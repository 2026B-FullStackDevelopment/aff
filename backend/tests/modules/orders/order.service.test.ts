import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findOrdersForRecipientMock,
  findOrderByIdAndRecipientMock,
  hasNonCancelledOrderForListingMock,
  withTransactionMock,
  cancelOrderByIdMock,
  markOrderRefundedMock,
  markOrderRefundPendingMock,
  setFeedbackMock,
  findByOrderIdMock,
  cancelAwaitingDeliveryForOrderMock,
  restoreStockMock,
  refundOrderPaymentMock,
  cancelPendingOrderPaymentMock,
  findOrdersByIdsMock,
  cancelOrdersByIdsMock,
} = vi.hoisted(() => ({
  findOrdersForRecipientMock: vi.fn(),
  findOrderByIdAndRecipientMock: vi.fn(),
  hasNonCancelledOrderForListingMock: vi.fn(),
  withTransactionMock: vi.fn(),
  cancelOrderByIdMock: vi.fn(),
  markOrderRefundedMock: vi.fn(),
  markOrderRefundPendingMock: vi.fn(),
  setFeedbackMock: vi.fn(),
  findByOrderIdMock: vi.fn(),
  cancelAwaitingDeliveryForOrderMock: vi.fn(),
  restoreStockMock: vi.fn(),
  refundOrderPaymentMock: vi.fn(),
  cancelPendingOrderPaymentMock: vi.fn(),
  findOrdersByIdsMock: vi.fn(),
  cancelOrdersByIdsMock: vi.fn(),
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  findOrdersForRecipient: findOrdersForRecipientMock,
  findOrderByIdAndRecipient: findOrderByIdAndRecipientMock,
  hasNonCancelledOrderForListing: hasNonCancelledOrderForListingMock,
  withTransaction: withTransactionMock,
  cancelOrderById: cancelOrderByIdMock,
  markOrderRefunded: markOrderRefundedMock,
  markOrderRefundPending: markOrderRefundPendingMock,
  setFeedback: setFeedbackMock,
  findOrdersByIds: findOrdersByIdsMock,
  cancelOrdersByIds: cancelOrdersByIdsMock,
}));

vi.mock('../../../src/modules/delivery/delivery.interface.js', () => ({
  deliveryInterface: {
    findByOrderId: findByOrderIdMock,
    cancelAwaitingDeliveryForOrder: cancelAwaitingDeliveryForOrderMock,
  },
}));

vi.mock('../../../src/modules/listings/listing.interface.js', () => ({
  listingInterface: {
    restoreStock: restoreStockMock,
  },
}));

vi.mock('../../../src/modules/payments/payment.interface.js', () => ({
  paymentInterface: {
    refundOrderPayment: refundOrderPaymentMock,
    cancelPendingOrderPayment: cancelPendingOrderPaymentMock,
  },
}));

import {
  listOrdersForRecipient,
  getOrderForRecipient,
  cancelOrder,
  submitFeedback,
  verifyOrderOwnership,
  hasNonCancelledOrderForListing,
  cancelOrdersForListingCancellation,
  refundCancelledOrders,
} from '../../../src/modules/orders/order.service.js';

// Group all tests related to order.service
describe('order.service', () => {

  // beforeEach runs before every it() test
  const databaseSession = { id: 'database-session' };

  beforeEach(() => {
    findOrdersForRecipientMock.mockClear();
    findOrderByIdAndRecipientMock.mockClear();
    hasNonCancelledOrderForListingMock.mockClear();
    withTransactionMock.mockClear();
    cancelOrderByIdMock.mockClear();
    markOrderRefundedMock.mockClear();
    setFeedbackMock.mockClear();
    findByOrderIdMock.mockClear();
    cancelAwaitingDeliveryForOrderMock.mockClear();
    restoreStockMock.mockClear();
    refundOrderPaymentMock.mockClear();
    cancelPendingOrderPaymentMock.mockClear();
    findOrdersByIdsMock.mockClear();
    cancelOrdersByIdsMock.mockClear();
    markOrderRefundPendingMock.mockClear();

    withTransactionMock.mockImplementation(
      async (operation: (session: unknown) => unknown) => operation(databaseSession),
    );
    findByOrderIdMock.mockResolvedValue(null);
  });

  describe('listOrdersForRecipient', () => {
    it('delegates to the repository, passing page/limit through', async () => {
      const page = { items: [{ order: { _id: 'o1' } }], page: 2, limit: 5, total: 1 };
      findOrdersForRecipientMock.mockResolvedValue(page);

      const result = await listOrdersForRecipient('r1', 2, 5);

      expect(findOrdersForRecipientMock).toHaveBeenCalledWith('r1', 2, 5);
      expect(result).toEqual(page);
    });
  });

  // Test group for verifyOwnership function
  describe('verifyOrderOwnership', () => {
    // MongoDB objectIds for testings; owner, another user, order
    const orderId = '507f1f77bcf86cd799439011';
    const ownerId = '507f191e810c19729de860ea';
    const differentRecipientId = '507f191e810c19729de860eb';

    it('returns true when the recipient owns the order', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue({
        _id: orderId,
        recipientId: ownerId,
      });

      const result = await verifyOrderOwnership(orderId, ownerId);

      expect(result).toBe(true);
      expect(findOrderByIdAndRecipientMock).toHaveBeenCalledWith(
        orderId,
        ownerId
      );
    });

    it('returns false when the order belongs to another recipient', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue(null);

      const result = await verifyOrderOwnership(
        orderId,
        differentRecipientId
      );

      expect(result).toBe(false);
      expect(findOrderByIdAndRecipientMock).toHaveBeenCalledWith(
        orderId,
        differentRecipientId
      );
    });

    it('returns false when the order does not exist', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue(null);

      const result = await verifyOrderOwnership(orderId, ownerId);

      expect(result).toBe(false);
    });

    it('returns false for an invalid order ID without calling the repository', async () => {
      const result = await verifyOrderOwnership(
        'invalid-order-id',
        ownerId
      );

      expect(result).toBe(false);
      expect(findOrderByIdAndRecipientMock).not.toHaveBeenCalled();
    });
  });

  describe('getOrderForRecipient', () => {
    const orderId = '507f1f77bcf86cd799439011';
    const ownerId = '507f191e810c19729de860ea';
    const differentRecipientId = '507f191e810c19729de860eb';

    it('returns the order and its Delivery id/stage when the recipient owns it', async () => {
      const order = { _id: orderId, recipientId: ownerId };
      findOrderByIdAndRecipientMock.mockResolvedValue(order);
      findByOrderIdMock.mockResolvedValue({ _id: 'delivery-1', orderId, stage: 'ASSIGNED' });

      const result = await getOrderForRecipient(orderId, ownerId);

      expect(result).toEqual({ order, deliveryStage: 'ASSIGNED', deliveryId: 'delivery-1' });
      expect(findOrderByIdAndRecipientMock).toHaveBeenCalledWith(
        orderId,
        ownerId,
      );
      expect(findByOrderIdMock).toHaveBeenCalledWith(orderId);
      expect(findByOrderIdMock).toHaveBeenCalledTimes(1);
    });

    it('returns a null deliveryStage when no Delivery exists yet', async () => {
      const order = { _id: orderId, recipientId: ownerId };
      findOrderByIdAndRecipientMock.mockResolvedValue(order);
      findByOrderIdMock.mockResolvedValue(null);

      const result = await getOrderForRecipient(orderId, ownerId);

      expect(result).toEqual({ order, deliveryStage: null, deliveryId: null });
    });

    it('throws a 404 when the order belongs to another recipient', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue(null);

      await expect(
        getOrderForRecipient(orderId, differentRecipientId),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws a 404 when the order does not exist', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue(null);

      await expect(getOrderForRecipient(orderId, ownerId)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws a 404 for an invalid order ID without calling the repository', async () => {
      await expect(
        getOrderForRecipient('invalid-order-id', ownerId),
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(findOrderByIdAndRecipientMock).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    const orderId = '507f1f77bcf86cd799439011';
    const recipientId = '507f191e810c19729de860ea';

    function prepareOrder(overrides: Record<string, unknown> = {}) {
      const order = {
        _id: orderId,
        recipientId,
        listingId: 'l1',
        quantity: 2,
        paymentMethod: 'CASH',
        paymentStatus: 'PAYMENT_PENDING',
        orderStatus: 'PREPARING',
        ...overrides,
      };
      findOrderByIdAndRecipientMock.mockResolvedValue(order);
      cancelOrderByIdMock.mockResolvedValue({ ...order, orderStatus: 'CANCELLED' });
      return order;
    }

    it('throws a 404 for an invalid order ID without calling the repository', async () => {
      await expect(cancelOrder('invalid-order-id', recipientId)).rejects.toMatchObject({
        statusCode: 404,
      });

      expect(findOrderByIdAndRecipientMock).not.toHaveBeenCalled();
    });

    it('throws a 404 when the order does not exist or belongs to another recipient', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue(null);

      await expect(cancelOrder(orderId, recipientId)).rejects.toMatchObject({
        statusCode: 404,
      });

      expect(findByOrderIdMock).not.toHaveBeenCalled();
    });

    it('cancels a free/cash order with no Delivery yet, restoring stock and reporting NOT_APPLICABLE', async () => {
      prepareOrder({ paymentMethod: 'CASH', paymentStatus: 'PAYMENT_PENDING' });
      findByOrderIdMock.mockResolvedValue(null);

      const result = await cancelOrder(orderId, recipientId);

      expect(cancelAwaitingDeliveryForOrderMock).not.toHaveBeenCalled();
      expect(cancelOrderByIdMock).toHaveBeenCalledWith(
        orderId,
        recipientId,
        expect.any(Date),
        databaseSession,
      );
      expect(restoreStockMock).toHaveBeenCalledWith('l1', 2, databaseSession);
      expect(refundOrderPaymentMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        order: expect.objectContaining({ orderStatus: 'CANCELLED' }),
        deliveryStage: null,
        refundStatus: 'NOT_APPLICABLE',
      });
    });

    it('cancels a Delivery still AWAITING_COURIER along with the Order', async () => {
      prepareOrder();
      findByOrderIdMock.mockResolvedValue({ orderId, stage: 'AWAITING_COURIER' });
      cancelAwaitingDeliveryForOrderMock.mockResolvedValue({
        orderId,
        stage: 'CANCELLED',
      });

      const result = await cancelOrder(orderId, recipientId);

      expect(cancelAwaitingDeliveryForOrderMock).toHaveBeenCalledWith(
        orderId,
        expect.any(Date),
        databaseSession,
      );
      expect(cancelOrderByIdMock).toHaveBeenCalled();
      expect(result.deliveryStage).toBe('CANCELLED');
    });

    it.each(['ASSIGNED', 'PICKED_UP', 'DELIVERED'])(
      'rejects with 409 once the Delivery stage is %s, leaving the Order untouched',
      async (stage) => {
        prepareOrder();
        findByOrderIdMock.mockResolvedValue({ orderId, stage });

        await expect(cancelOrder(orderId, recipientId)).rejects.toMatchObject({
          statusCode: 409,
        });

        expect(withTransactionMock).not.toHaveBeenCalled();
        expect(cancelOrderByIdMock).not.toHaveBeenCalled();
      },
    );

    it('rejects with 409 when a Courier claim wins the race between the pre-check and the atomic cancel', async () => {
      prepareOrder();
      findByOrderIdMock.mockResolvedValue({ orderId, stage: 'AWAITING_COURIER' });
      cancelAwaitingDeliveryForOrderMock.mockResolvedValue(null);

      await expect(cancelOrder(orderId, recipientId)).rejects.toMatchObject({
        statusCode: 409,
      });

      expect(cancelOrderByIdMock).not.toHaveBeenCalled();
      expect(restoreStockMock).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the Order was already cancelled by a concurrent request', async () => {
      prepareOrder();
      findByOrderIdMock.mockResolvedValue(null);
      cancelOrderByIdMock.mockResolvedValue(null);

      await expect(cancelOrder(orderId, recipientId)).rejects.toMatchObject({
        statusCode: 409,
      });

      expect(restoreStockMock).not.toHaveBeenCalled();
    });

    it('starts a synchronous refund for a Stripe-paid order, marks it REFUND_PENDING, and reports REFUND_PENDING', async () => {
      prepareOrder({ paymentMethod: 'STRIPE', paymentStatus: 'PAID' });
      refundOrderPaymentMock.mockResolvedValue({ status: 'REFUND_PENDING', refundId: 're_1' });

      const result = await cancelOrder(orderId, recipientId);

      expect(refundOrderPaymentMock).toHaveBeenCalledWith(orderId);
      expect(markOrderRefundPendingMock).toHaveBeenCalledWith(orderId);
      expect(result.refundStatus).toBe('REFUND_PENDING');
    });

    it('still commits the cancellation and reports FAILED when the Stripe refund call itself errors', async () => {
      prepareOrder({ paymentMethod: 'STRIPE', paymentStatus: 'PAID' });
      refundOrderPaymentMock.mockRejectedValue(new Error('Stripe is down'));

      const result = await cancelOrder(orderId, recipientId);

      expect(result.order).toMatchObject({ orderStatus: 'CANCELLED' });
      expect(result.refundStatus).toBe('FAILED');
      expect(markOrderRefundPendingMock).not.toHaveBeenCalled();
    });

    it('does not call Stripe for a Stripe order that never completed checkout (still PAYMENT_PENDING)', async () => {
      prepareOrder({ paymentMethod: 'STRIPE', paymentStatus: 'PAYMENT_PENDING' });

      const result = await cancelOrder(orderId, recipientId);

      expect(refundOrderPaymentMock).not.toHaveBeenCalled();
      expect(result.refundStatus).toBe('NOT_APPLICABLE');
    });

    it('cancels the dangling PENDING Payment row inside the transaction for a Stripe order still PAYMENT_PENDING', async () => {
      prepareOrder({ paymentMethod: 'STRIPE', paymentStatus: 'PAYMENT_PENDING' });

      await cancelOrder(orderId, recipientId);

      expect(cancelPendingOrderPaymentMock).toHaveBeenCalledWith(orderId, databaseSession);
    });

    it('does not touch the Payment row for a free order', async () => {
      prepareOrder({ paymentMethod: undefined, paymentStatus: 'FREE' });

      await cancelOrder(orderId, recipientId);

      expect(cancelPendingOrderPaymentMock).not.toHaveBeenCalled();
    });

    it('does not touch the Payment row for a cash order', async () => {
      prepareOrder({ paymentMethod: 'CASH', paymentStatus: 'PAYMENT_PENDING' });

      await cancelOrder(orderId, recipientId);

      expect(cancelPendingOrderPaymentMock).not.toHaveBeenCalled();
    });

    it('does not touch the Payment row for an already-paid Stripe order (refund path handles it instead)', async () => {
      prepareOrder({ paymentMethod: 'STRIPE', paymentStatus: 'PAID' });
      refundOrderPaymentMock.mockResolvedValue({ status: 'REFUND_PENDING', refundId: 're_1' });

      await cancelOrder(orderId, recipientId);

      expect(cancelPendingOrderPaymentMock).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrdersForListingCancellation', () => {
    it('is a no-op on an empty id list', async () => {
      const result = await cancelOrdersForListingCancellation(
        [],
        'd1',
        new Date(),
        databaseSession,
      );

      expect(result).toEqual({ cancelledCount: 0, refundableOrderIds: [] });
      expect(findOrdersByIdsMock).not.toHaveBeenCalled();
      expect(cancelOrdersByIdsMock).not.toHaveBeenCalled();
    });

    it('restores stock per order with the right quantity', async () => {
      findOrdersByIdsMock.mockResolvedValue([
        { _id: 'o1', listingId: 'l1', quantity: 2, paymentMethod: 'CASH', paymentStatus: 'PAID' },
        { _id: 'o2', listingId: 'l2', quantity: 5, paymentMethod: undefined, paymentStatus: 'FREE' },
      ]);
      cancelOrdersByIdsMock.mockResolvedValue(2);

      await cancelOrdersForListingCancellation(['o1', 'o2'], 'd1', new Date(), databaseSession);

      expect(restoreStockMock).toHaveBeenCalledWith('l1', 2, databaseSession);
      expect(restoreStockMock).toHaveBeenCalledWith('l2', 5, databaseSession);
    });

    it('cancels pending payments only for STRIPE + PAYMENT_PENDING orders', async () => {
      findOrdersByIdsMock.mockResolvedValue([
        { _id: 'o1', listingId: 'l1', quantity: 1, paymentMethod: 'STRIPE', paymentStatus: 'PAYMENT_PENDING' },
        { _id: 'o2', listingId: 'l2', quantity: 1, paymentMethod: 'STRIPE', paymentStatus: 'PAID' },
        { _id: 'o3', listingId: 'l3', quantity: 1, paymentMethod: 'CASH', paymentStatus: 'PAYMENT_PENDING' },
      ]);
      cancelOrdersByIdsMock.mockResolvedValue(3);

      await cancelOrdersForListingCancellation(['o1', 'o2', 'o3'], 'd1', new Date(), databaseSession);

      expect(cancelPendingOrderPaymentMock).toHaveBeenCalledTimes(1);
      expect(cancelPendingOrderPaymentMock).toHaveBeenCalledWith('o1', databaseSession);
    });

    it('returns exactly the STRIPE + PAID ids as refundable, skipping CASH and FREE orders', async () => {
      findOrdersByIdsMock.mockResolvedValue([
        { _id: 'o1', listingId: 'l1', quantity: 1, paymentMethod: 'STRIPE', paymentStatus: 'PAID' },
        { _id: 'o2', listingId: 'l2', quantity: 1, paymentMethod: 'CASH', paymentStatus: 'PAID' },
        { _id: 'o3', listingId: 'l3', quantity: 1, paymentMethod: undefined, paymentStatus: 'FREE' },
        { _id: 'o4', listingId: 'l4', quantity: 1, paymentMethod: 'STRIPE', paymentStatus: 'PAYMENT_PENDING' },
      ]);
      cancelOrdersByIdsMock.mockResolvedValue(4);

      const result = await cancelOrdersForListingCancellation(
        ['o1', 'o2', 'o3', 'o4'],
        'd1',
        new Date(),
        databaseSession,
      );

      expect(result.refundableOrderIds).toEqual(['o1']);
      expect(result.cancelledCount).toBe(4);
      expect(refundOrderPaymentMock).not.toHaveBeenCalled();
    });

    it('makes no Stripe call for a CASH order', async () => {
      findOrdersByIdsMock.mockResolvedValue([
        { _id: 'o1', listingId: 'l1', quantity: 1, paymentMethod: 'CASH', paymentStatus: 'PAID' },
      ]);
      cancelOrdersByIdsMock.mockResolvedValue(1);

      await cancelOrdersForListingCancellation(['o1'], 'd1', new Date(), databaseSession);

      expect(cancelPendingOrderPaymentMock).not.toHaveBeenCalled();
      expect(refundOrderPaymentMock).not.toHaveBeenCalled();
    });
  });

  describe('refundCancelledOrders', () => {
    it('returns an empty array for no orders and calls Stripe for none', async () => {
      const result = await refundCancelledOrders([]);

      expect(result).toEqual([]);
      expect(refundOrderPaymentMock).not.toHaveBeenCalled();
    });

    it('reports REFUND_PENDING per order and does not let one failure block the others', async () => {
      refundOrderPaymentMock
        .mockResolvedValueOnce({ status: 'REFUND_PENDING', refundId: 're_1' })
        .mockRejectedValueOnce(new Error('Stripe is down'))
        .mockResolvedValueOnce({ status: 'REFUND_PENDING', refundId: 're_3' });

      const result = await refundCancelledOrders(['o1', 'o2', 'o3']);

      expect(result).toEqual([
        { orderId: 'o1', refundStatus: 'REFUND_PENDING' },
        { orderId: 'o2', refundStatus: 'FAILED' },
        { orderId: 'o3', refundStatus: 'REFUND_PENDING' },
      ]);
      expect(refundOrderPaymentMock).toHaveBeenCalledTimes(3);
    });

    it('marks each successfully-refunded order REFUND_PENDING, skipping the one that failed', async () => {
      refundOrderPaymentMock
        .mockResolvedValueOnce({ status: 'REFUND_PENDING', refundId: 're_1' })
        .mockRejectedValueOnce(new Error('Stripe is down'));

      await refundCancelledOrders(['o1', 'o2']);

      expect(markOrderRefundPendingMock).toHaveBeenCalledTimes(1);
      expect(markOrderRefundPendingMock).toHaveBeenCalledWith('o1');
    });
  });

  describe('submitFeedback', () => {
    const orderId = '507f1f77bcf86cd799439011';
    const recipientId = '507f191e810c19729de860ea';

    it('throws a 404 for an invalid order ID without calling the repository', async () => {
      await expect(submitFeedback('invalid-order-id', recipientId, 'Great!')).rejects.toMatchObject({
        statusCode: 404,
      });

      expect(findOrderByIdAndRecipientMock).not.toHaveBeenCalled();
    });

    it('throws a 404 when the order does not exist or belongs to another recipient', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue(null);

      await expect(submitFeedback(orderId, recipientId, 'Great!')).rejects.toMatchObject({
        statusCode: 404,
      });

      expect(setFeedbackMock).not.toHaveBeenCalled();
    });

    it('throws a 409 when the order has not been delivered yet', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue({
        _id: orderId,
        orderStatus: 'PREPARING',
        feedback: undefined,
      });

      await expect(submitFeedback(orderId, recipientId, 'Great!')).rejects.toMatchObject({
        statusCode: 409,
      });

      expect(setFeedbackMock).not.toHaveBeenCalled();
    });

    it('throws a 409 carrying the existing feedback when feedback was already submitted', async () => {
      const existingFeedback = { comment: 'Already left this.', createdAt: new Date('2026-01-01T00:00:00.000Z') };
      findOrderByIdAndRecipientMock.mockResolvedValue({
        _id: orderId,
        orderStatus: 'DELIVERED',
        feedback: existingFeedback,
      });

      await expect(submitFeedback(orderId, recipientId, 'Great!')).rejects.toMatchObject({
        statusCode: 409,
        feedback: existingFeedback,
      });

      expect(setFeedbackMock).not.toHaveBeenCalled();
    });

    it('persists feedback and returns it when the order is DELIVERED with no existing feedback', async () => {
      findOrderByIdAndRecipientMock.mockResolvedValue({
        _id: orderId,
        orderStatus: 'DELIVERED',
        feedback: undefined,
      });
      const persistedFeedback = { comment: 'Great!', createdAt: expect.any(Date) };
      setFeedbackMock.mockResolvedValue({ _id: orderId, feedback: persistedFeedback });

      const result = await submitFeedback(orderId, recipientId, 'Great!');

      expect(setFeedbackMock).toHaveBeenCalledWith(orderId, 'Great!', expect.any(Date));
      expect(result).toEqual(persistedFeedback);
    });

    it('re-fetches and throws a 409 carrying the real feedback when the atomic write loses a race', async () => {
      findOrderByIdAndRecipientMock
        .mockResolvedValueOnce({ _id: orderId, orderStatus: 'DELIVERED', feedback: undefined })
        .mockResolvedValueOnce({ _id: orderId, feedback: { comment: 'Beat you to it!', createdAt: new Date() } });
      setFeedbackMock.mockResolvedValue(null);

      await expect(submitFeedback(orderId, recipientId, 'Great!')).rejects.toMatchObject({
        statusCode: 409,
        feedback: { comment: 'Beat you to it!' },
      });

      expect(findOrderByIdAndRecipientMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasNonCancelledOrderForListing', () => {
    it('delegates to the repository, scoped to the listing and recipient', async () => {
      hasNonCancelledOrderForListingMock.mockResolvedValue(true);

      const result = await hasNonCancelledOrderForListing('l1', 'r1');

      expect(hasNonCancelledOrderForListingMock).toHaveBeenCalledWith(
        'l1',
        'r1',
        undefined,
      );
      expect(result).toBe(true);
    });

    it('returns false when the repository finds no matching order', async () => {
      hasNonCancelledOrderForListingMock.mockResolvedValue(false);

      const result = await hasNonCancelledOrderForListing('l1', 'r1');

      expect(result).toBe(false);
    });
  });

});

