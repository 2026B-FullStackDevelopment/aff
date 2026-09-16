import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineStage } from 'mongoose';

const { findOneMock, leanMock, aggregateMock } = vi.hoisted(() => ({
  findOneMock: vi.fn(() => ({ lean: vi.fn() })),
  leanMock: vi.fn(),
  aggregateMock: vi.fn(),
}));

vi.mock('../../../src/modules/delivery/delivery.model.js', () => ({
  default: {
    findOne: findOneMock,
    aggregate: aggregateMock,
  },
}));

import {
  listForAdmin,
  findQueue,
  findActiveByCourier,
} from '../../../src/modules/delivery/delivery.queue.repository.js';

/** Pulls the `$match` stage out of the pipeline the repository built. */
function matchStageOf(pipeline: PipelineStage[]): Record<string, unknown> {
  const stage = pipeline.find((entry) => '$match' in entry) as
    | { $match: Record<string, unknown> }
    | undefined;

  return stage?.$match ?? {};
}

describe('delivery.queue.repository', () => {
  beforeEach(() => {
    aggregateMock.mockReset();
    findOneMock.mockClear();
    leanMock.mockReset();
    aggregateMock.mockResolvedValue([{ items: [], metadata: [] }]);
  });

  describe('listForAdmin', () => {
    it('returns the requested page alongside the total count', async () => {
      const delivery = { _id: 'd1', stage: 'PICKED_UP' };
      aggregateMock.mockResolvedValue([
        { items: [delivery], metadata: [{ total: 7 }] },
      ]);

      const result = await listForAdmin({ page: 2, limit: 5 });

      expect(result).toEqual({
        items: [delivery],
        page: 2,
        limit: 5,
        total: 7,
      });
    });

    it('reports a total of zero when no Delivery matches', async () => {
      const result = await listForAdmin({ page: 1, limit: 20 });

      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('matches every stage when no filter is requested', async () => {
      await listForAdmin({ page: 1, limit: 20 });

      const [pipeline] = aggregateMock.mock.calls[0];
      expect(matchStageOf(pipeline)).toEqual({});
    });

    it('narrows the match to one stage when the Admin filters', async () => {
      await listForAdmin({ page: 1, limit: 20, stage: 'PICKED_UP' });

      const [pipeline] = aggregateMock.mock.calls[0];
      expect(matchStageOf(pipeline)).toEqual({ stage: 'PICKED_UP' });
    });

    it('skips the pages before the one requested', async () => {
      await listForAdmin({ page: 3, limit: 10 });

      const [pipeline] = aggregateMock.mock.calls[0];
      const facet = pipeline.find((entry) => '$facet' in entry) as {
        $facet: { items: PipelineStage[] };
      };

      expect(facet.$facet.items).toEqual([{ $skip: 20 }, { $limit: 10 }]);
    });

    it('sorts newest first so the Admin sees current activity at the top', async () => {
      await listForAdmin({ page: 1, limit: 20 });

      const [pipeline] = aggregateMock.mock.calls[0];
      const sort = pipeline.find((entry) => '$sort' in entry) as {
        $sort: Record<string, 1 | -1>;
      };

      expect(sort.$sort).toEqual({ createdAt: -1, _id: -1 });
    });
  });

  describe('findQueue', () => {
    it('returns only unclaimed Deliveries', async () => {
      await findQueue({ page: 1, limit: 20 });

      const [pipeline] = aggregateMock.mock.calls[0];
      expect(matchStageOf(pipeline)).toEqual({ stage: 'AWAITING_COURIER' });
    });

    it('sorts oldest first, with a stable tiebreak', async () => {
      await findQueue({ page: 1, limit: 20 });

      const [pipeline] = aggregateMock.mock.calls[0];
      const sort = pipeline.find((entry) => '$sort' in entry) as {
        $sort: Record<string, 1 | -1>;
      };

      expect(sort.$sort).toEqual({ createdAt: 1, _id: 1 });
    });

    it('returns the requested page alongside the total count', async () => {
      const delivery = { _id: 'd1', stage: 'AWAITING_COURIER' };
      aggregateMock.mockResolvedValue([
        { items: [delivery], metadata: [{ total: 4 }] },
      ]);

      const result = await findQueue({ page: 2, limit: 5 });

      expect(result).toEqual({
        items: [delivery],
        page: 2,
        limit: 5,
        total: 4,
      });
    });

    it('reports an empty queue as a zero total', async () => {
      const result = await findQueue({ page: 1, limit: 20 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findActiveByCourier', () => {
    it('matches the Courier in-flight Delivery at either stage', async () => {
      const findOneLeanMock = vi.fn().mockResolvedValue({ _id: 'd1', stage: 'PICKED_UP' });
      findOneMock.mockReturnValueOnce({ lean: findOneLeanMock });

      const result = await findActiveByCourier('c1');

      expect(findOneMock).toHaveBeenCalledWith({
        courierId: 'c1',
        stage: { $in: ['ASSIGNED', 'PICKED_UP'] },
      });
      expect(result).toEqual({ _id: 'd1', stage: 'PICKED_UP' });
    });
  });
});
