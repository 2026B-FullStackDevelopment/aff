// Mock service standing in for `GET /orders/mine` (enriched) until the
// backend ships the donor/category/collectedAt fields this page needs.
// Swap this module out for a real `collectionHistoryService.ts` that calls
// `httpClient.get(API_ROUTES.orders.mine, ...)` later — `useCollectionHistory`
// is written against this exact return shape so that swap is a one-line change.
import type { FoodCategory, ListingUnit } from '@/types/api';

export interface CollectionHistoryItem {
  id: string;
  donationName: string;
  imageUrl: string | null;
  donorName: string;
  category: FoodCategory;
  quantity: number;
  unit: ListingUnit;
  /** 0 = Free */
  price: number;
  /** ISO 8601 */
  collectedAt: string;
  /** null renders as "N/A" — cash/free collections have no card on file */
  paymentLast4: string | null;
  feedbackSubmitted: boolean;
  /** false for free / N/A rows per the approved mockup */
  canLeaveFeedback: boolean;
}

export interface CollectionHistoryPage {
  items: CollectionHistoryItem[];
  page: number;
  limit: number;
  total: number;
}

const PAGE_SIZE = 6;

// Eight distinct rows — enough to exercise every cell state (free, paid,
// already-reviewed, ineligible-for-feedback) without hand-authoring 120 rows.
const SAMPLE_ITEMS: CollectionHistoryItem[] = [
  {
    id: 'col_001',
    donationName: 'Fresh Organic Vegetables',
    imageUrl: null,
    donorName: 'Green Valley Farms',
    category: 'VEGETABLE',
    quantity: 2,
    unit: 'KILOGRAM',
    price: 0,
    collectedAt: '2026-08-02T10:30:00Z',
    paymentLast4: null,
    feedbackSubmitted: false,
    canLeaveFeedback: false,
  },
  {
    id: 'col_002',
    donationName: 'Artisan Bread',
    imageUrl: null,
    donorName: 'The Hearth Bakery',
    category: 'BAKED_GOODS',
    quantity: 1,
    unit: 'UNIT',
    price: 20000,
    collectedAt: '2026-08-02T09:30:00Z',
    paymentLast4: null,
    feedbackSubmitted: false,
    canLeaveFeedback: false,
  },
  {
    id: 'col_003',
    donationName: 'Milk',
    imageUrl: null,
    donorName: 'Metro Mart',
    category: 'DRINK',
    quantity: 1,
    unit: 'LITER',
    price: 45000,
    collectedAt: '2026-08-01T10:30:00Z',
    paymentLast4: '4421',
    feedbackSubmitted: false,
    canLeaveFeedback: true,
  },
  {
    id: 'col_004',
    donationName: 'Seasonal Fruits Mix',
    imageUrl: null,
    donorName: 'Metro Mart',
    category: 'FRUIT',
    quantity: 2,
    unit: 'UNIT',
    price: 45000,
    collectedAt: '2026-07-31T10:30:00Z',
    paymentLast4: '4421',
    feedbackSubmitted: false,
    canLeaveFeedback: true,
  },
  {
    id: 'col_005',
    donationName: 'Rice & Salmon Bento',
    imageUrl: null,
    donorName: 'Metro Mart',
    category: 'COOKED_DISH',
    quantity: 1,
    unit: 'UNIT',
    price: 45000,
    collectedAt: '2026-07-31T10:20:00Z',
    paymentLast4: '4421',
    feedbackSubmitted: false,
    canLeaveFeedback: true,
  },
  {
    id: 'col_006',
    donationName: 'Raw Organic Honey',
    imageUrl: null,
    donorName: 'Metro Mart',
    category: 'DRINK',
    quantity: 2,
    unit: 'UNIT',
    price: 45000,
    collectedAt: '2026-07-31T10:00:00Z',
    paymentLast4: '4421',
    feedbackSubmitted: false,
    canLeaveFeedback: true,
  },
  {
    id: 'col_007',
    donationName: 'Grilled Chicken Salad',
    imageUrl: null,
    donorName: 'Green Valley Farms',
    category: 'COOKED_DISH',
    quantity: 1,
    unit: 'UNIT',
    price: 35000,
    collectedAt: '2026-07-29T12:15:00Z',
    paymentLast4: '4421',
    feedbackSubmitted: true,
    canLeaveFeedback: true,
  },
  {
    id: 'col_008',
    donationName: 'Mixed Nuts Pack',
    imageUrl: null,
    donorName: 'The Hearth Bakery',
    category: 'BAKED_GOODS',
    quantity: 1,
    unit: 'UNIT',
    price: 0,
    collectedAt: '2026-07-28T09:00:00Z',
    paymentLast4: null,
    feedbackSubmitted: false,
    canLeaveFeedback: false,
  },
];

// Reported total matches the approved mockup's "1–6 of 120" pagination even
// though only page 1 has authored content — later pages loop the sample set
// so the list never appears to run dry while this is still mock data.
const REPORTED_TOTAL = 120;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchCollectionHistory(
  page: number,
  limit: number = PAGE_SIZE,
): Promise<CollectionHistoryPage> {
  await delay(350);

  const items = Array.from({ length: limit }, (_, index) => {
    const source = SAMPLE_ITEMS[(page - 1) * limit + index] ?? SAMPLE_ITEMS[index % SAMPLE_ITEMS.length];
    // Page 1 renders the authored rows verbatim; later pages reuse the same
    // items under distinct ids so keys stay unique and the table never looks
    // broken, without pretending there are 120 real historical collections.
    return page === 1 ? source : { ...source, id: `${source.id}_p${page}` };
  });

  return { items, page, limit, total: REPORTED_TOTAL };
}

export async function submitFeedback(orderId: string, comment: string): Promise<void> {
  await delay(300);
  if (!comment.trim()) {
    throw new Error('Feedback comment cannot be empty.');
  }
  // No network call — the hook flips local state on resolution.
}

export const COLLECTION_HISTORY_PAGE_SIZE = PAGE_SIZE;
