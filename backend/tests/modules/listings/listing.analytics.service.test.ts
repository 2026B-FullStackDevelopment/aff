import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findDonorAnalyticsMock } = vi.hoisted(() => ({
  findDonorAnalyticsMock: vi.fn(),
}));

vi.mock('../../../src/modules/listings/listing.analytics.repository.js', () => ({
  findDonorAnalytics: findDonorAnalyticsMock,
}));

import { getDonorAnalytics } from '../../../src/modules/listings/listing.analytics.service.js';

describe('listing.analytics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps aggregate ids and zero-fills categories with no Listings', async () => {
    findDonorAnalyticsMock.mockResolvedValue({
      summary: [{
        totalRevenue: 4550000,
        totalListings: 42,
        currentListings: 8,
        soldOutListings: 31,
      }],
      categories: [{ _id: 'VEGETABLE', listingCount: 15, revenue: 1200000 }],
      topListings: [{
        _id: '60d5ecb8b392d70015342a1b',
        name: 'Surplus Rice & Veggie Combos',
        revenue: 850000,
      }],
    });

    const result = await getDonorAnalytics('donor-1');

    expect(result).toMatchObject({
      totalRevenue: 4550000,
      totalListings: 42,
      currentListings: 8,
      soldOutListings: 31,
      topListings: [{
        id: '60d5ecb8b392d70015342a1b',
        name: 'Surplus Rice & Veggie Combos',
        revenue: 850000,
      }],
    });
    expect(result.categories).toHaveLength(6);
    expect(result.categories[0]).toEqual({
      category: 'VEGETABLE',
      listingCount: 15,
      revenue: 1200000,
    });
    expect(result.categories.find(({ category }) => category === 'DRINK')).toEqual({
      category: 'DRINK',
      listingCount: 0,
      revenue: 0,
    });
  });

  it('returns a complete zero snapshot for a Donor with no Listings', async () => {
    findDonorAnalyticsMock.mockResolvedValue(undefined);

    const result = await getDonorAnalytics('donor-1');

    expect(result).toMatchObject({
      totalRevenue: 0,
      totalListings: 0,
      currentListings: 0,
      soldOutListings: 0,
      topListings: [],
    });
    expect(result.categories.every(
      ({ listingCount, revenue }) => listingCount === 0 && revenue === 0,
    )).toBe(true);
  });
});
