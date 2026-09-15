import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findMock,
  findByIdMock,
  aggregateMock,
  leanMock,
  sessionMock,
} = vi.hoisted(() => {
  const lean = vi.fn();
  const session = vi.fn();
  const query = { lean, session };
  session.mockReturnValue(query);

  return {
    findMock: vi.fn(() => ({ lean })),
    findByIdMock: vi.fn(() => query),
    aggregateMock: vi.fn(),
    leanMock: lean,
    sessionMock: session,
  };
});

vi.mock('../../../src/modules/listings/listing.model.js', () => ({
  default: {
    find: findMock,
    findById: findByIdMock,
    aggregate: aggregateMock,
  },
}));

import {
  findAvailableListings,
  findListingById,
  findListingsByIds,
  findMyListingsWithStats,
} from '../../../src/modules/listings/listing.query.repository.js';

describe('listing.query.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leanMock.mockResolvedValue([{ _id: 'l1' }]);
  });

  it('returns only ACTIVE Listings with pagination', async () => {
    aggregateMock.mockResolvedValue([
      {
        items: [{ _id: 'l1', status: 'ACTIVE' }],
        metadata: [{ total: 3 }],
      },
    ]);

    const result = await findAvailableListings({ page: 2, limit: 10 });

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(pipeline[0].$match).toEqual({ status: 'ACTIVE' });
    expect(pipeline).toContainEqual({ $sort: { createdAt: -1, _id: 1 } });
    expect(JSON.stringify(pipeline)).toContain('"$skip":10');
    expect(JSON.stringify(pipeline)).toContain('"$limit":10');
    expect(result).toEqual({
      items: [{ _id: 'l1', status: 'ACTIVE' }],
      page: 2,
      limit: 10,
      total: 3,
    });
  });

  it('returns an empty available page when aggregation has no result', async () => {
    aggregateMock.mockResolvedValue([]);

    await expect(
      findAvailableListings({ page: 1, limit: 20 }),
    ).resolves.toEqual({ items: [], page: 1, limit: 20, total: 0 });
  });

  it('composes public search, city, category and price filters', async () => {
    aggregateMock.mockResolvedValue([
      { items: [{ _id: 'l1' }], metadata: [{ total: 1 }] },
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

    expect(aggregateMock.mock.calls[0]?.[0][0].$match).toEqual({
      status: 'ACTIVE',
      name: { $regex: 'bread', $options: 'i' },
      city: 'Thành phố Hà Nội',
      category: 'BAKED_GOODS',
      price: { $gte: 1000, $lte: 5000 },
    });
  });

  it('only applies the supplied public price bound', async () => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, priceMin: 1000 });
    expect(aggregateMock.mock.calls[0]?.[0][0].$match.price).toEqual({
      $gte: 1000,
    });

    aggregateMock.mockClear();
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, priceMax: 5000 });
    expect(aggregateMock.mock.calls[0]?.[0][0].$match.price).toEqual({
      $lte: 5000,
    });
  });

  it('escapes regular-expression characters in public search', async () => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({
      page: 1,
      limit: 20,
      search: 'bread (fresh)',
    });

    expect(aggregateMock.mock.calls[0]?.[0][0].$match.name).toEqual({
      $regex: 'bread \\(fresh\\)',
      $options: 'i',
    });
  });

  it.each([
    ['asc', 1],
    ['desc', -1],
  ] as const)('sorts available Listings by price %s', async (order, direction) => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, sort: 'price', order });

    expect(aggregateMock.mock.calls[0]?.[0]).toContainEqual({
      $sort: { price: direction, _id: 1 },
    });
  });

  it('ignores order when no public sort field is supplied', async () => {
    aggregateMock.mockResolvedValue([{ items: [], metadata: [{ total: 0 }] }]);

    await findAvailableListings({ page: 1, limit: 20, order: 'asc' });

    expect(aggregateMock.mock.calls[0]?.[0]).toContainEqual({
      $sort: { createdAt: -1, _id: 1 },
    });
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
    expect(pipeline[0].$match).toMatchObject({
      status: { $in: ['CANCELLED', 'SOLD_OUT'] },
      category: 'BAKED_GOODS',
      name: { $regex: 'bread', $options: 'i' },
    });
    expect(pipeline).toContainEqual({ $sort: { revenue: -1, _id: 1 } });
    expect(JSON.stringify(pipeline)).toContain('"$skip":5');
    expect(JSON.stringify(pipeline)).toContain('"$limit":5');
    expect(result).toMatchObject({ page: 2, limit: 5, total: 6 });
  });

  it('finds one Listing as a lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'l1' });

    await findListingById('l1');

    expect(findByIdMock).toHaveBeenCalledWith('l1');
    expect(sessionMock).not.toHaveBeenCalled();
    expect(leanMock).toHaveBeenCalled();
  });

  it('attaches findListingById to a supplied session', async () => {
    const session = { id: 'session' };

    await findListingById('l1', session as never);

    expect(sessionMock).toHaveBeenCalledWith(session);
    expect(leanMock).toHaveBeenCalled();
  });

  it('loads requested Listing summaries in one projected query', async () => {
    leanMock.mockResolvedValue([
      { _id: 'l1', donorId: 'd1', name: 'Sourdough loaves' },
    ]);

    const result = await findListingsByIds(['l1', 'l2']);

    expect(findMock).toHaveBeenCalledWith(
      { _id: { $in: ['l1', 'l2'] } },
      { _id: 1, donorId: 1, name: 1 },
    );
    expect(result).toEqual([
      { _id: 'l1', donorId: 'd1', name: 'Sourdough loaves' },
    ]);
  });

  it('skips the database when no Listing summaries are requested', async () => {
    await expect(findListingsByIds([])).resolves.toEqual([]);
    expect(findMock).not.toHaveBeenCalled();
  });
});
