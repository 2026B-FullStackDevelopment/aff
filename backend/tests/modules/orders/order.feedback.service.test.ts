import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findOrderByIdAndRecipientMock, setFeedbackMock } = vi.hoisted(() => ({
  findOrderByIdAndRecipientMock: vi.fn(),
  setFeedbackMock: vi.fn(),
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  findOrderByIdAndRecipient: findOrderByIdAndRecipientMock,
  setFeedback: setFeedbackMock,
}));

import { submitFeedback } from '../../../src/modules/orders/order.feedback.service.js';

describe('order.feedback.service', () => {
  beforeEach(() => {
    findOrderByIdAndRecipientMock.mockClear();
    setFeedbackMock.mockClear();
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
});
