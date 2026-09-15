import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminListingDTO } from '@/types/api';

const { cancelListingMock, listListingsMock, toastSuccessMock } = vi.hoisted(() => ({
  cancelListingMock: vi.fn(),
  listListingsMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('../services/adminOversight.service', () => ({
  adminOversightService: {
    cancelListing: cancelListingMock,
    listListings: listListingsMock,
  },
}));

vi.mock('@/shared/components/ui/sonner', () => ({
  toast: {
    error: vi.fn(),
    success: toastSuccessMock,
  },
}));

import { useAdminListings } from './useAdminListings';

const listing: AdminListingDTO = {
  id: '507f1f77bcf86cd799439011',
  donor: {
    id: '507f1f77bcf86cd799439012',
    companyName: 'Khang Community Kitchen',
    city: 'Ho Chi Minh City',
    location: {
      latitude: 10.77689,
      longitude: 106.70081,
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
  },
  name: 'Vegetable meal boxes',
  description: 'Fresh meals prepared for collection today.',
  imageUrl: null,
  unit: 'UNIT',
  category: 'COOKED_DISH',
  isVegetarian: true,
  price: 15000,
  city: 'Thu Duc City',
  status: 'ACTIVE',
  donationLimit: 30,
  rationLimitPerPerson: 2,
  quantityRemaining: 18,
  pendingOrderCount: 1,
  createdAt: '2026-09-12T08:30:00.000Z',
};

function successResponse<T>(data: T) {
  return {
    data,
    status: 200,
    headers: new Headers(),
    ok: true,
  };
}

describe('useAdminListings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the current all-status page after a successful cancellation', async () => {
    const cancelledListing = { ...listing, status: 'CANCELLED' as const };

    listListingsMock
      .mockResolvedValueOnce(successResponse({
        items: [listing], page: 1, limit: 20, total: 21,
      }))
      .mockResolvedValueOnce(successResponse({
        items: [listing], page: 2, limit: 20, total: 21,
      }))
      .mockResolvedValueOnce(successResponse({
        items: [cancelledListing], page: 2, limit: 20, total: 21,
      }));
    cancelListingMock.mockResolvedValue(successResponse({
      listing: cancelledListing,
      cancelledOrderCount: 1,
      refundOutcomes: [],
    }));

    const { result } = renderHook(() => useAdminListings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.goToPage(2);
    });
    await waitFor(() => expect(result.current.page).toBe(2));

    let succeeded = false;
    await act(async () => {
      succeeded = await result.current.cancelListing(listing);
    });

    expect(succeeded).toBe(true);
    expect(result.current.page).toBe(2);
    expect(result.current.items[0]?.status).toBe('CANCELLED');
    expect(listListingsMock).toHaveBeenLastCalledWith({
      page: 2,
      limit: 20,
      search: undefined,
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Listing cancelled',
      expect.objectContaining({ description: '1 pending order was cancelled.' }),
    );
  });
});
