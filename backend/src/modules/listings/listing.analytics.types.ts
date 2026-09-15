// Defines internal aggregation results for Donor Listing analytics.
import type { Types } from 'mongoose';
import type { FoodCategory } from './listing.types.js';

interface DonorAnalyticsSummaryAggregate {
  totalRevenue: number;
  totalListings: number;
  currentListings: number;
  soldOutListings: number;
}

interface DonorAnalyticsCategoryAggregate {
  _id: FoodCategory;
  listingCount: number;
  revenue: number;
}

interface DonorAnalyticsTopListingAggregate {
  _id: Types.ObjectId;
  name: string;
  revenue: number;
}

interface DonorAnalyticsAggregationResult {
  summary: DonorAnalyticsSummaryAggregate[];
  categories: DonorAnalyticsCategoryAggregate[];
  topListings: DonorAnalyticsTopListingAggregate[];
}

export type {
  DonorAnalyticsSummaryAggregate,
  DonorAnalyticsCategoryAggregate,
  DonorAnalyticsTopListingAggregate,
  DonorAnalyticsAggregationResult,
};
