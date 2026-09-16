import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOrCreateForOrderMock, findDeliveryByOrderIdMock } = vi.hoisted(() => ({
  findOrCreateForOrderMock: vi.fn(),
  findDeliveryByOrderIdMock: vi.fn(),
}));

vi.mock('../../../src/modules/delivery/delivery.orders.repository.js', () => ({
  findOrCreateForOrder: findOrCreateForOrderMock,
  findDeliveryByOrderId: findDeliveryByOrderIdMock,
}));

import { createForOrder } from '../../../src/modules/delivery/delivery.orders.service.js';

describe('delivery.orders.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createForOrder', () => {
    it('returns the single Delivery created or found for the Order', async () => {
      const delivery = {
        _id: 'd1',
        orderId: 'o1',
        stage: 'AWAITING_COURIER',
      };
      findOrCreateForOrderMock.mockResolvedValue(delivery);

      const result = await createForOrder('o1');

      expect(findOrCreateForOrderMock).toHaveBeenCalledWith(
        'o1',
        undefined,
      );
      expect(result).toBe(delivery);
    });

    it('is idempotent when a concurrent insert wins the unique orderId race', async () => {
      const existing = {
        _id: 'd1',
        orderId: 'o1',
        stage: 'AWAITING_COURIER',
      };
      findOrCreateForOrderMock.mockRejectedValue({ code: 11000 });
      findDeliveryByOrderIdMock.mockResolvedValue(existing);

      const result = await createForOrder('o1');

      expect(findDeliveryByOrderIdMock).toHaveBeenCalledWith(
        'o1',
        undefined,
      );
      expect(result).toBe(existing);
    });
  });
});
