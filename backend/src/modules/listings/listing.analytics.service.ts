// Builds the Donor analytics response from database aggregation results.
import * as listingAnalyticsRepository from './listing.analytics.repository.js';
import type { DonorAnalyticsResponseDto } from './listing.response.dto.js';
import type { FoodCategory } from './listing.types.js';

const FOOD_CATEGORIES: readonly FoodCategory[] = [
  'VEGETABLE',
  'COOKED_DISH',
  'FRUIT',
  'BAKED_GOODS',
  'MEAT',
  'DRINK',
];

/** Returns a zero-safe analytics snapshot for the authenticated Donor. */
async function getDonorAnalytics(
  donorId: string,
): Promise<DonorAnalyticsResponseDto> {
  const result = await listingAnalyticsRepository.findDonorAnalytics(donorId);
  const summary = result?.summary[0];
  const categoryByName = new Map(
    (result?.categories ?? []).map((category) => [category._id, category]),
  );

  return {
    totalRevenue: summary?.totalRevenue ?? 0,
    totalListings: summary?.totalListings ?? 0,
    currentListings: summary?.currentListings ?? 0,
    soldOutListings: summary?.soldOutListings ?? 0,
    categories: FOOD_CATEGORIES.map((category) => ({
      category,
      listingCount: categoryByName.get(category)?.listingCount ?? 0,
      revenue: categoryByName.get(category)?.revenue ?? 0,
    })),
    topListings: (result?.topListings ?? []).map((listing) => ({
      id: String(listing._id),
      name: listing.name,
      revenue: listing.revenue,
    })),
  };
}

export { getDonorAnalytics };
