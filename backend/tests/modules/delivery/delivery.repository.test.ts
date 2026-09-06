import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineStage } from 'mongoose';

const {
  findOneMock,
  findOneAndUpdateMock,
  sessionMock,
  leanMock,
  aggregateMock,
} = vi.hoisted(() => {
  const leanMock = vi.fn();
  const sessionMock = vi.fn(() => ({ lean: leanMock }));
  return {
    findOneMock: vi.fn(() => ({ lean: leanMock, session: sessionMock })),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    sessionMock,
    leanMock,
    aggregateMock: vi.fn(),
  };
});

vi.mock('../../../src/modules/delivery/delivery.model.js', () => ({
  default: {
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
    aggregate: aggregateMock,
  },
}));

import {
  findDeliveryByOrderId,
  cancelAwaitingDeliveryForOrder,
  listForAdmin,
  findQueue,
  claimIfAvailable,
  findActiveByCourier,
  markPickedUpIfAssigned,
  recordCourierLocation,
} from '../../../src/modules/delivery/delivery.repository.js';

describe('delivery.repository', () => {
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

/** Pulls the `$match` stage out of the pipeline the repository built. */
function matchStageOf(pipeline: PipelineStage[]): Record<string, unknown> {
  const stage = pipeline.find((entry) => '$match' in entry) as
    | { $match: Record<string, unknown> }
    | undefined;

  return stage?.$match ?? {};
}

describe('delivery.repository.listForAdmin', () => {
  beforeEach(() => {
    aggregateMock.mockReset();
    findOneAndUpdateMock.mockClear();
    findOneMock.mockClear();
    leanMock.mockReset();
    aggregateMock.mockResolvedValue([{ items: [], metadata: [] }]);
  });

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

  describe('claimIfAvailable', () => {
    it('claims only a Delivery still awaiting a Courier, in one write', async () => {
      leanMock.mockResolvedValue({ _id: 'd1', stage: 'ASSIGNED' });

      const result = await claimIfAvailable('d1', 'c1');

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: 'd1', stage: 'AWAITING_COURIER' },
        { $set: { stage: 'ASSIGNED', courierId: 'c1' } },
        { new: true, runValidators: true },
      );
      expect(result).toEqual({ _id: 'd1', stage: 'ASSIGNED' });
    });

    it('resolves null when the Delivery is no longer awaiting a Courier', async () => {
      leanMock.mockResolvedValue(null);

      expect(await claimIfAvailable('d1', 'c1')).toBeNull();
    });
  });

  describe('findActiveByCourier', () => {
    it('matches the Courier in-flight Delivery at either stage', async () => {
      leanMock.mockResolvedValue({ _id: 'd1', stage: 'PICKED_UP' });

      const result = await findActiveByCourier('c1');

      expect(findOneMock).toHaveBeenCalledWith({
        courierId: 'c1',
        stage: { $in: ['ASSIGNED', 'PICKED_UP'] },
      });
      expect(result).toEqual({ _id: 'd1', stage: 'PICKED_UP' });
    });
  });

  describe('markPickedUpIfAssigned', () => {
    it('advances only an assigned Delivery belonging to this Courier', async () => {
      const pickedUpAt = new Date('2026-09-07T10:00:00.000Z');
      leanMock.mockResolvedValue({ _id: 'd1', stage: 'PICKED_UP' });

      const result = await markPickedUpIfAssigned('d1', 'c1', pickedUpAt);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: 'd1', courierId: 'c1', stage: 'ASSIGNED' },
        { $set: { stage: 'PICKED_UP', pickedUpAt } },
        { new: true, runValidators: true },
      );
      expect(result).toEqual({ _id: 'd1', stage: 'PICKED_UP' });
    });

    it('resolves null when the Delivery is not assigned to this Courier', async () => {
      leanMock.mockResolvedValue(null);

      expect(await markPickedUpIfAssigned('d1', 'c1', new Date())).toBeNull();
    });
  });

  describe('recordCourierLocation', () => {
    it('writes the position to this Courier picked-up Delivery in one operation', async () => {
      leanMock.mockResolvedValue({ _id: 'd1', orderId: 'o1', stage: 'PICKED_UP' });

      const result = await recordCourierLocation('c1', {
        latitude: 10.8,
        longitude: 106.6,
      });

      const [filter, update, options] = findOneAndUpdateMock.mock.calls[0];
      expect(filter).toEqual({ courierId: 'c1', stage: 'PICKED_UP' });
      expect(update.$set.courierLastLocation).toMatchObject({
        latitude: 10.8,
        longitude: 106.6,
      });
      expect(update.$set.courierLastLocation.updatedAt).toBeInstanceOf(Date);
      expect(options).toEqual({ new: true });
      expect(result).toEqual({ _id: 'd1', orderId: 'o1', stage: 'PICKED_UP' });
    });

    it('resolves null when the Courier has no picked-up Delivery', async () => {
      leanMock.mockResolvedValue(null);

      expect(
        await recordCourierLocation('c1', { latitude: 10.8, longitude: 106.6 }),
      ).toBeNull();
    });
  });
});
