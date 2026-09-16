import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOneAndUpdateMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    leanMock,
  };
});

vi.mock('../../../src/modules/delivery/delivery.model.js', () => ({
  default: {
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import {
  claimIfAvailable,
  markPickedUpIfAssigned,
  recordCourierLocation,
} from '../../../src/modules/delivery/delivery.courier.repository.js';

describe('delivery.courier.repository', () => {
  beforeEach(() => {
    findOneAndUpdateMock.mockClear();
    leanMock.mockClear();
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
