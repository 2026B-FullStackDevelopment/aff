import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findOrdersForRecipientMock,
  findOrderByIdAndRecipientMock,
  hasNonCancelledOrderForListingMock,
  findByOrderIdMock,
} = vi.hoisted(() => ({
  findOrdersForRecipientMock: vi.fn(),
  findOrderByIdAndRecipientMock: vi.fn(),
  hasNonCancelledOrderForListingMock: vi.fn(),
  findByOrderIdMock: vi.fn(),
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  findOrdersForRecipient: findOrdersForRecipientMock,
  findOrderByIdAndRecipient: findOrderByIdAndRecipientMock,
  hasNonCancelledOrderForListing: hasNonCancelledOrderForListingMock,
}));

vi.mock('../../../src/modules/delivery/delivery.interface.js', () => ({
  deliveryInterface: {
    findByOrderId: findByOrderIdMock,
  },
}));

import {
  listOrdersForRecipient,
  getOrderForRecipient,
  verifyOrderOwnership,
  hasNonCancelledOrderForListing,
} from '../../../src/modules/orders/order.query.service.js';

describe('order.query.service', () => {
  beforeEach(() => {
    findOrdersForRecipientMock.mockClear();
    findOrderByIdAndRecipientMock.mockClear();
    hasNonCancelledOrderForListingMock.mockClear();
    findByOrderIdMock.mockClear();

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
