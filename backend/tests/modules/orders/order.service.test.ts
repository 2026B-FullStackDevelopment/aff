import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findOrdersByRecipientMock,
  findOrderByIdAndRecipientMock,
  hasNonCancelledOrderForListingMock,
} = vi.hoisted(() => ({
  findOrdersByRecipientMock: vi.fn(),
  findOrderByIdAndRecipientMock: vi.fn(),
  hasNonCancelledOrderForListingMock: vi.fn(),
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  findOrdersByRecipient: findOrdersByRecipientMock,
  findOrderByIdAndRecipient: findOrderByIdAndRecipientMock,
  hasNonCancelledOrderForListing: hasNonCancelledOrderForListingMock,
}));

import {
  listOrdersForRecipient,
  verifyOrderOwnership,
  hasNonCancelledOrderForListing,
} from '../../../src/modules/orders/order.service.js';

// Group all tests related to order.service
describe('order.service', () => {

  // beforeEach runs before every it() test
  beforeEach(() => {
    findOrdersByRecipientMock.mockClear();
    findOrderByIdAndRecipientMock.mockClear();
    hasNonCancelledOrderForListingMock.mockClear();
  });

  describe('listOrdersForRecipient', () => {
    it('delegates to the repository', async () => {
      findOrdersByRecipientMock.mockResolvedValue([{ _id: 'o1' }]);

      const result = await listOrdersForRecipient('r1');

      expect(findOrdersByRecipientMock).toHaveBeenCalledWith('r1');
      expect(result).toEqual([{ _id: 'o1' }]);
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

