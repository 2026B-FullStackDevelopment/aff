import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineStage } from 'mongoose';

const { createMock, aggregateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  aggregateMock: vi.fn(),
}));

vi.mock('../../../src/modules/notifications/notification.model.js', () => ({
  default: {
    create: createMock,
    aggregate: aggregateMock,
  },
}));

import { create, findByUserId } from '../../../src/modules/notifications/notification.repository.js';

const USER_ID = '507f191e810c19729de860ea';

describe('notification.repository', () => {
  beforeEach(() => {
    createMock.mockReset();
    aggregateMock.mockReset();
    aggregateMock.mockResolvedValue([{ items: [], metadata: [] }]);
  });

  describe('create', () => {
    it('writes userId, type, and message, defaulting orderId/listingId to null when omitted', async () => {
      createMock.mockResolvedValue({ _id: 'n1' });

      const result = await create({
        userId: USER_ID,
        type: 'SOLD_OUT',
        message: 'Your listing "Bread" just sold out.',
      });

      expect(createMock).toHaveBeenCalledWith({
        userId: USER_ID,
        type: 'SOLD_OUT',
        message: 'Your listing "Bread" just sold out.',
        orderId: null,
        listingId: null,
      });
      expect(result).toEqual({ _id: 'n1' });
    });

    it('passes through orderId and listingId when given', async () => {
      createMock.mockResolvedValue({ _id: 'n1' });

      await create({
        userId: USER_ID,
        type: 'PAYMENT_SUCCESS',
        message: 'Your payment for order #o1 was successful.',
        orderId: 'o1',
      });

      expect(createMock).toHaveBeenCalledWith({
        userId: USER_ID,
        type: 'PAYMENT_SUCCESS',
        message: 'Your payment for order #o1 was successful.',
        orderId: 'o1',
        listingId: null,
      });
    });
  });

  describe('findByUserId', () => {
    it('matches only the given userId', async () => {
      await findByUserId(USER_ID, 1, 20);

      const [pipeline] = aggregateMock.mock.calls[0] as [PipelineStage[]];
      const match = pipeline.find((stage) => '$match' in stage) as { $match: Record<string, unknown> };
      expect(match.$match).toMatchObject({ userId: expect.anything() });
    });

    it('sorts newest first, with a stable tiebreak', async () => {
      await findByUserId(USER_ID, 1, 20);

      const [pipeline] = aggregateMock.mock.calls[0] as [PipelineStage[]];
      const sort = pipeline.find((stage) => '$sort' in stage) as { $sort: Record<string, 1 | -1> };
      expect(sort.$sort).toEqual({ createdAt: -1, _id: -1 });
    });

    it('skips the pages before the one requested', async () => {
      await findByUserId(USER_ID, 3, 10);

      const [pipeline] = aggregateMock.mock.calls[0] as [PipelineStage[]];
      const facet = pipeline.find((stage) => '$facet' in stage) as { $facet: { items: PipelineStage[] } };
      expect(facet.$facet.items).toEqual([{ $skip: 20 }, { $limit: 10 }]);
    });

    it('returns the requested page alongside the total count', async () => {
      const notification = { _id: 'n1', type: 'SOLD_OUT' };
      aggregateMock.mockResolvedValue([{ items: [notification], metadata: [{ total: 7 }] }]);

      const result = await findByUserId(USER_ID, 2, 5);

      expect(result).toEqual({ items: [notification], page: 2, limit: 5, total: 7 });
    });

    it('reports a total of zero when the user has no notifications', async () => {
      const result = await findByUserId(USER_ID, 1, 20);

      expect(result).toEqual({ items: [], page: 1, limit: 20, total: 0 });
    });
  });
});
