import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findOrdersByRecipientMock } = vi.hoisted(() => ({
  findOrdersByRecipientMock: vi.fn(),
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  findOrdersByRecipient: findOrdersByRecipientMock,
}));

import { listOrdersForRecipient } from '../../../src/modules/orders/order.service.js';

describe('order.service', () => {
  beforeEach(() => {
    findOrdersByRecipientMock.mockClear();
  });

  describe('listOrdersForRecipient', () => {
    it('delegates to the repository', async () => {
      findOrdersByRecipientMock.mockResolvedValue([{ _id: 'o1' }]);

      const result = await listOrdersForRecipient('r1');

      expect(findOrdersByRecipientMock).toHaveBeenCalledWith('r1');
      expect(result).toEqual([{ _id: 'o1' }]);
    });
  });
});
