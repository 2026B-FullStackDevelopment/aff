import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findOrderByIdAndRecipientMock,
  withTransactionMock,
  cancelOrderByIdMock,
  markOrderRefundedMock,
  markOrderRefundPendingMock,
  findByOrderIdMock,
  cancelAwaitingDeliveryForOrderMock,
  restoreStockMock,
  refundOrderPaymentMock,
  cancelPendingOrderPaymentMock,
  findOrdersByIdsMock,
  cancelOrdersByIdsMock,
} = vi.hoisted(() => ({
  findOrderByIdAndRecipientMock: vi.fn(),
  withTransactionMock: vi.fn(),
  cancelOrderByIdMock: vi.fn(),
  markOrderRefundedMock: vi.fn(),
  markOrderRefundPendingMock: vi.fn(),
  findByOrderIdMock: vi.fn(),
  cancelAwaitingDeliveryForOrderMock: vi.fn(),
  restoreStockMock: vi.fn(),
  refundOrderPaymentMock: vi.fn(),
  cancelPendingOrderPaymentMock: vi.fn(),
  findOrdersByIdsMock: vi.fn(),
  cancelOrdersByIdsMock: vi.fn(),
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  findOrderByIdAndRecipient: findOrderByIdAndRecipientMock,
  withTransaction: withTransactionMock,
  cancelOrderById: cancelOrderByIdMock,
  markOrderRefunded: markOrderRefundedMock,
  markOrderRefundPending: markOrderRefundPendingMock,
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
  cancelOrder,
  cancelOrdersForListingCancellation,
  refundCancelledOrders,
} from '../../../src/modules/orders/order.cancellation.service.js';

// Group all tests related to order.cancellation.service
describe('order.cancellation.service', () => {

  // beforeEach runs before every it() test
  const databaseSession = { id: 'database-session' };

  beforeEach(() => {
    findOrderByIdAndRecipientMock.mockClear();
    withTransactionMock.mockClear();
    cancelOrderByIdMock.mockClear();
    markOrderRefundedMock.mockClear();
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
});
