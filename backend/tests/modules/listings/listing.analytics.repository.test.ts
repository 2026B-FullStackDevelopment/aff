import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregateMock } = vi.hoisted(() => ({
  aggregateMock: vi.fn(),
}));

vi.mock('../../../src/modules/listings/listing.model.js', () => ({
  default: { aggregate: aggregateMock },
}));

import { findDonorAnalytics } from '../../../src/modules/listings/listing.analytics.repository.js';

describe('listing.analytics.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds one Donor-scoped aggregation for counts, paid revenue and rankings', async () => {
    const donorId = '507f1f77bcf86cd799439011';
    const aggregateResult = {
      summary: [{
        totalRevenue: 12000,
        totalListings: 3,
        currentListings: 2,
        soldOutListings: 1,
      }],
      categories: [{ _id: 'BAKED_GOODS', listingCount: 3, revenue: 12000 }],
      topListings: [{ _id: '507f1f77bcf86cd799439012', name: 'Bread', revenue: 12000 }],
    };
    aggregateMock.mockResolvedValue([aggregateResult]);

    await expect(findDonorAnalytics(donorId)).resolves.toEqual(aggregateResult);

    const pipeline = aggregateMock.mock.calls[0]?.[0];
    expect(String(pipeline[0].$match.donorId)).toBe(donorId);
    expect(JSON.stringify(pipeline)).toContain('"paymentStatus":"PAID"');
    expect(JSON.stringify(pipeline)).toContain('"orderStatus":{"$ne":"CANCELLED"}');
    expect(pipeline.at(-1).$facet.topListings).toContainEqual({ $limit: 5 });
    expect(pipeline.at(-1).$facet.summary[0].$group).toMatchObject({
      totalRevenue: { $sum: '$revenue' },
      totalListings: { $sum: 1 },
    });
  });

  it('returns undefined when MongoDB produces no facet result', async () => {
    aggregateMock.mockResolvedValue([]);

    await expect(
      findDonorAnalytics('507f1f77bcf86cd799439011'),
    ).resolves.toBeUndefined();
  });
});
