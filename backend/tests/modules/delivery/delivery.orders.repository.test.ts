import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findOneMock,
  findOneAndUpdateMock,
  sessionMock,
  leanMock,
} = vi.hoisted(() => {
  const leanMock = vi.fn();
  const sessionMock = vi.fn(() => ({ lean: leanMock }));
  return {
    findOneMock: vi.fn(() => ({ lean: leanMock, session: sessionMock })),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    sessionMock,
    leanMock,
  };
});

vi.mock('../../../src/modules/delivery/delivery.model.js', () => ({
  default: {
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import {
  findDeliveryByOrderId,
  cancelAwaitingDeliveryForOrder,
} from '../../../src/modules/delivery/delivery.orders.repository.js';

describe('delivery.orders.repository', () => {
  beforeEach(() => {
    findOneMock.mockClear();
    findOneAndUpdateMock.mockClear();
    sessionMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue({ _id: 'd1' });
  });

  describe('findDeliveryByOrderId', () => {
    it('queries by orderId and returns a lean document', async () => {
      await findDeliveryByOrderId('o1');

      expect(findOneMock).toHaveBeenCalledWith({ orderId: 'o1' });
      expect(leanMock).toHaveBeenCalled();
    });

    it('scopes the query to the given session when provided', async () => {
      const session = { id: 'database-session' };

      await findDeliveryByOrderId('o1', session as never);

      expect(sessionMock).toHaveBeenCalledWith(session);
      expect(leanMock).toHaveBeenCalled();
    });
  });

  describe('cancelAwaitingDeliveryForOrder', () => {
    it('atomically cancels a Delivery still AWAITING_COURIER', async () => {
      const cancelledAt = new Date('2026-01-01T00:00:00.000Z');
      leanMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        stage: 'CANCELLED',
        cancelledAt,
      });

      const result = await cancelAwaitingDeliveryForOrder('o1', cancelledAt);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          orderId: 'o1',
          stage: 'AWAITING_COURIER',
        },
        {
          $set: {
            stage: 'CANCELLED',
            cancelledAt,
          },
        },
        { new: true, runValidators: true, session: undefined },
      );
      expect(result).toMatchObject({ stage: 'CANCELLED' });
    });

    it('returns null once the stage has moved past AWAITING_COURIER (claim-race guard)', async () => {
      leanMock.mockResolvedValue(null);

      const result = await cancelAwaitingDeliveryForOrder('o1', new Date());

      expect(result).toBeNull();
    });
  });
});
