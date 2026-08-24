import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findMock,
  createMock,
  findByIdMock,
  findByIdAndUpdateMock,
  findOneAndUpdateMock,
  aggregateMock,
  leanMock,
} = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    findMock: vi.fn(() => ({ lean: leanMock })),
    createMock: vi.fn(),
    findByIdMock: vi.fn(() => ({ lean: leanMock })),
    findByIdAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    aggregateMock: vi.fn(),
    leanMock,
  };
});

vi.mock('../../../src/modules/listings/listing.model.js', () => ({
  default: {
    find: findMock,
    create: createMock,
    findById: findByIdMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
    findOneAndUpdate: findOneAndUpdateMock,
    aggregate: aggregateMock,
  },
}));

import {
  findAvailableListings,
  createListing,
  findListingById,
  updateListing,
  findMyListingsWithStats,
  decrementStockAtomically,
} from '../../../src/modules/listings/listing.repository.js';

describe('listing.repository', () => {
  beforeEach(() => {
    findMock.mockClear();
    createMock.mockClear();
    findByIdMock.mockClear();
    findByIdAndUpdateMock.mockClear();
    findOneAndUpdateMock.mockClear();
    aggregateMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue([{ _id: 'l1' }]);
  });

  it('findAvailableListings filters by status ACTIVE and merges extra filters', async () => {
    await findAvailableListings({ category: 'FRUIT' });

    expect(findMock).toHaveBeenCalledWith({ category: 'FRUIT', status: 'ACTIVE' });
    expect(leanMock).toHaveBeenCalled();
  });

  it('createListing calls Listing.create with the given data', async () => {
    createMock.mockResolvedValue({ _id: 'l1' });

    const result = await createListing({
      donorId: 'd1',
      name: 'Bread',
      unit: 'UNIT',
      category: 'BAKED_GOODS',
      isVegetarian: true,
      price: 0,
      donationLimit: 10,
      quantityRemaining: 10,
    });

    expect(createMock).toHaveBeenCalledWith({
      donorId: 'd1',
      name: 'Bread',
      unit: 'UNIT',
      category: 'BAKED_GOODS',
      isVegetarian: true,
      price: 0,
      donationLimit: 10,
      quantityRemaining: 10,
    });
    expect(result).toEqual({ _id: 'l1' });
  });

  it('findListingById queries by id and returns a lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'l1' });

    await findListingById('l1');

    expect(findByIdMock).toHaveBeenCalledWith('l1');
    expect(leanMock).toHaveBeenCalled();
  });

  it('updateListing updates by id and returns the new lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'l1', status: 'PAUSED' });

    await updateListing('l1', { name: 'Updated' });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith('l1', { name: 'Updated' }, { new: true });
    expect(leanMock).toHaveBeenCalled();
  });

  it('builds a Donor-scoped statistics query with filters and pagination', async () => {
    aggregateMock.mockResolvedValue([
      {
        items: [{ _id: 'l1', donatedQuantity: 4, revenue: 12000 }],
        metadata: [{ total: 6 }],
      },
    ]);

    const result = await findMyListingsWithStats(
      '507f1f77bcf86cd799439011',
      {
        status: 'PAST',
        search: 'bread',
        category: 'BAKED_GOODS',
        from: '2026-01-01',
        to: '2026-01-31',
        sort: 'revenue',
        order: 'desc',
        page: 2,
        limit: 5,
      },
    );

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline).toEqual(expect.any(Array));
    expect(pipeline[0].$match).toMatchObject({
      status: { $in: ['CANCELLED', 'SOLD_OUT'] },
      category: 'BAKED_GOODS',
      name: { $regex: 'bread', $options: 'i' },
    });
    expect(pipeline).toContainEqual({
      $sort: { revenue: -1, _id: 1 },
    });
    expect(JSON.stringify(pipeline)).toContain('"$skip":5');
    expect(JSON.stringify(pipeline)).toContain('"$limit":5');
    expect(result).toMatchObject({ page: 2, limit: 5, total: 6 });
  });

  it('guards the stock decrement atomically and marks the exact-zero result SOLD_OUT', async () => {
    leanMock.mockResolvedValue({
      _id: 'l1',
      quantityRemaining: 0,
      status: 'SOLD_OUT',
    });

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
            quantityRemaining: {
              $subtract: ['$quantityRemaining', 2],
            },
          },
        },
      ]),
      { new: true, session: undefined },
    );

    const updatePipeline = findOneAndUpdateMock.mock.calls[0]?.[1];
    expect(JSON.stringify(updatePipeline)).toContain('SOLD_OUT');
  });
});
