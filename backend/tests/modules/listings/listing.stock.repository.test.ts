import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOneAndUpdateMock, leanMock } = vi.hoisted(() => {
  const lean = vi.fn();

  return {
    findOneAndUpdateMock: vi.fn(() => ({ lean })),
    leanMock: lean,
  };
});

vi.mock('../../../src/modules/listings/listing.model.js', () => ({
  default: {
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import {
  decrementStockAtomically,
  decrementStockForReserveAtomically,
  restoreStockAtomically,
} from '../../../src/modules/listings/listing.stock.repository.js';

describe('listing.stock.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guards a Donor stock decrement and marks exact-zero stock SOLD_OUT', async () => {
    await decrementStockAtomically('l1', 'd1', 2);

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      {
        _id: 'l1',
        donorId: 'd1',
        status: 'ACTIVE',
        unit: { $ne: 'PER_REQUEST' },
        quantityRemaining: { $gte: 2 },
      },
      expect.arrayContaining([
        {
          $set: {
            quantityRemaining: { $subtract: ['$quantityRemaining', 2] },
          },
        },
      ]),
      { new: true, session: undefined, updatePipeline: true },
    );

    expect(JSON.stringify(findOneAndUpdateMock.mock.calls[0]?.[1])).toContain(
      'SOLD_OUT',
    );
  });

  it('guards a reservation stock decrement without a Donor filter', async () => {
    await decrementStockForReserveAtomically('l1', 2);

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      {
        _id: 'l1',
        status: 'ACTIVE',
        unit: { $ne: 'PER_REQUEST' },
        quantityRemaining: { $gte: 2 },
      },
      expect.arrayContaining([
        {
          $set: {
            quantityRemaining: { $subtract: ['$quantityRemaining', 2] },
          },
        },
      ]),
      { new: true, session: undefined, updatePipeline: true },
    );

    expect(JSON.stringify(findOneAndUpdateMock.mock.calls[0]?.[1])).toContain(
      'SOLD_OUT',
    );
  });

  describe('restoreStockAtomically', () => {
    it('adds quantity and defines the SOLD_OUT-to-ACTIVE transition', async () => {
      await restoreStockAtomically('l1', 2);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: 'l1' },
        expect.arrayContaining([
          {
            $set: {
              quantityRemaining: { $add: ['$quantityRemaining', 2] },
            },
          },
        ]),
        { new: true, session: undefined, updatePipeline: true },
      );

      const updatePipeline = findOneAndUpdateMock.mock.calls[0]?.[1];
      expect(JSON.stringify(updatePipeline)).toContain('SOLD_OUT');
      expect(JSON.stringify(updatePipeline)).toContain('ACTIVE');
    });

    it('leaves non-SOLD_OUT statuses unchanged', async () => {
      await restoreStockAtomically('l1', 3);

      const updatePipeline = findOneAndUpdateMock.mock.calls[0]?.[1];
      expect(updatePipeline[1].$set.status).toEqual({
        $cond: [{ $eq: ['$status', 'SOLD_OUT'] }, 'ACTIVE', '$status'],
      });
    });

    it('has no Donor filter or stock-floor guard', async () => {
      await restoreStockAtomically('l1', 4);

      expect(findOneAndUpdateMock.mock.calls[0]?.[0]).toEqual({ _id: 'l1' });
    });
  });
});
