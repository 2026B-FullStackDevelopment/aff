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
  findListingsForAdmin,
  createListing,
  findListingById,
  updateListing,
  findMyListingsWithStats,
  decrementStockAtomically,
  decrementStockForReserveAtomically,
  restoreStockAtomically,
  findListingsByIds,
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

  it('findAvailableListings returns only ACTIVE Listings with pagination', async () => {
    aggregateMock.mockResolvedValue([
      {
        items: [{ _id: 'l1', status: 'ACTIVE' }],
        metadata: [{ total: 3 }],
      },
    ]);

    const result = await findAvailableListings({ page: 2, limit: 10 });

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline).toEqual(expect.any(Array));
    expect(pipeline[0].$match).toEqual({ status: 'ACTIVE' });
    expect(pipeline).toContainEqual({
      $sort: { createdAt: -1, _id: 1 },
    });
    expect(JSON.stringify(pipeline)).toContain('"$skip":10');
    expect(JSON.stringify(pipeline)).toContain('"$limit":10');
    expect(result).toEqual({
      items: [{ _id: 'l1', status: 'ACTIVE' }],
      page: 2,
      limit: 10,
      total: 3,
    });
  });

  it('findListingsForAdmin does not apply an implicit status filter', async () => {
    aggregateMock.mockResolvedValue([
      {
        items: [{ _id: 'l1', status: 'CANCELLED' }],
        metadata: [{ total: 4 }],
      },
    ]);

    const result = await findListingsForAdmin({
      page: 2,
      limit: 2,
      hasSearch: false,
    });

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline[0]).toEqual({ $match: {} });
    expect(pipeline).toContainEqual({ $sort: { createdAt: -1, _id: -1 } });
    expect(JSON.stringify(pipeline)).toContain('"$skip":2');
    expect(result).toEqual({
      items: [{ _id: 'l1', status: 'CANCELLED' }],
      page: 2,
      limit: 2,
      total: 4,
    });
  });

  it('findListingsForAdmin searches by Listing id or matching Donor ids', async () => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [] }]);

    await findListingsForAdmin({
      page: 1,
      limit: 20,
      hasSearch: true,
      listingId: '507f1f77bcf86cd799439011',
      donorIds: ['507f1f77bcf86cd799439012'],
    });

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline[0].$match.$or[0]._id.toString()).toBe(
      '507f1f77bcf86cd799439011',
    );
    expect(pipeline[0].$match.$or[1].donorId.$in[0].toString()).toBe(
      '507f1f77bcf86cd799439012',
    );
  });

  it('findAvailableListings returns an empty page when the aggregation returns no results', async () => {
    aggregateMock.mockResolvedValue([]);

    const result = await findAvailableListings({ page: 1, limit: 20 });

    expect(result).toEqual({ items: [], page: 1, limit: 20, total: 0 });
  });

  it('findAvailableListings composes search/city/category/price filters into $match, always scoped to ACTIVE', async () => {
    aggregateMock.mockResolvedValue([
      { items: [{ _id: 'l1', status: 'ACTIVE' }], metadata: [{ total: 1 }] },
    ]);

    await findAvailableListings({
      page: 1,
      limit: 20,
      search: 'bread',
      city: 'Thành phố Hà Nội',
      category: 'BAKED_GOODS',
      priceMin: 1000,
      priceMax: 5000,
    });

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline[0].$match).toEqual({
      status: 'ACTIVE',
      name: { $regex: 'bread', $options: 'i' },
      city: 'Thành phố Hà Nội',
      category: 'BAKED_GOODS',
      price: { $gte: 1000, $lte: 5000 },
    });
  });

  it('findAvailableListings only applies the price bound(s) actually supplied', async () => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, priceMin: 1000 });

    let pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline[0].$match.price).toEqual({ $gte: 1000 });

    aggregateMock.mockClear();
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, priceMax: 5000 });

    pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline[0].$match.price).toEqual({ $lte: 5000 });
  });

  it('findAvailableListings escapes regex special characters in search', async () => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, search: 'bread (fresh)' });

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline[0].$match.name).toEqual({
      $regex: 'bread \\(fresh\\)',
      $options: 'i',
    });
  });

  it.each([
    ['asc', 1],
    ['desc', -1],
  ] as const)('findAvailableListings sorts by price %s when sort=price', async (order, direction) => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, sort: 'price', order });

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline).toContainEqual({ $sort: { price: direction, _id: 1 } });
  });

  it('findAvailableListings ignores a stray order with no sort and keeps the default createdAt desc', async () => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, order: 'asc' });

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline).toContainEqual({ $sort: { createdAt: -1, _id: 1 } });
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
      { new: true, session: undefined, updatePipeline: true },
    );

    const updatePipeline = findOneAndUpdateMock.mock.calls[0]?.[1];
    expect(JSON.stringify(updatePipeline)).toContain('SOLD_OUT');
  });

  it('guards the reserve-scoped stock decrement without a donorId filter and marks the exact-zero result SOLD_OUT', async () => {
    leanMock.mockResolvedValue({
      _id: 'l1',
      quantityRemaining: 0,
      status: 'SOLD_OUT',
    });

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
            quantityRemaining: {
              $subtract: ['$quantityRemaining', 2],
            },
          },
        },
      ]),
      { new: true, session: undefined, updatePipeline: true },
    );

    const updatePipeline = findOneAndUpdateMock.mock.calls[0]?.[1];
    expect(JSON.stringify(updatePipeline)).toContain('SOLD_OUT');
  });

  describe('restoreStockAtomically', () => {
    it('adds the quantity back and flips a SOLD_OUT Listing back to ACTIVE, clearing closedAt', async () => {
      leanMock.mockResolvedValue({
        _id: 'l1',
        quantityRemaining: 2,
        status: 'ACTIVE',
        closedAt: null,
      });

      await restoreStockAtomically('l1', 2);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        { _id: 'l1' },
        expect.arrayContaining([
          {
            $set: {
              quantityRemaining: {
                $add: ['$quantityRemaining', 2],
              },
            },
          },
        ]),
        { new: true, session: undefined, updatePipeline: true },
      );

      const updatePipeline = findOneAndUpdateMock.mock.calls[0]?.[1];
      expect(JSON.stringify(updatePipeline)).toContain('SOLD_OUT');
      expect(JSON.stringify(updatePipeline)).toContain('ACTIVE');
    });

    it('leaves a PAUSED Listing\'s status untouched, only restoring the count', async () => {
      leanMock.mockResolvedValue({
        _id: 'l1',
        quantityRemaining: 5,
        status: 'PAUSED',
      });

      await restoreStockAtomically('l1', 3);

      const updatePipeline = findOneAndUpdateMock.mock.calls[0]?.[1];
      const statusStage = updatePipeline[1].$set.status;
      expect(statusStage).toEqual({
        $cond: [{ $eq: ['$status', 'SOLD_OUT'] }, 'ACTIVE', '$status'],
      });
    });

    it('applies no donorId filter and no stock-floor guard', async () => {
      leanMock.mockResolvedValue({ _id: 'l1', quantityRemaining: 10 });

      await restoreStockAtomically('l1', 4);

      const filter = findOneAndUpdateMock.mock.calls[0]?.[0];
      expect(filter).toEqual({ _id: 'l1' });
    });
  });

  describe('findListingsByIds', () => {
    it('loads the requested Listings in one query, projecting the donor and name', async () => {
      leanMock.mockResolvedValue([{ _id: 'l1', donorId: 'd1', name: 'Sourdough loaves' }]);

      const result = await findListingsByIds(['l1', 'l2']);

      expect(findMock).toHaveBeenCalledWith(
        { _id: { $in: ['l1', 'l2'] } },
        { _id: 1, donorId: 1, name: 1 },
      );
      expect(result).toEqual([{ _id: 'l1', donorId: 'd1', name: 'Sourdough loaves' }]);
    });

    it('skips the database entirely when asked for nothing', async () => {
      const result = await findListingsByIds([]);

      expect(findMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
