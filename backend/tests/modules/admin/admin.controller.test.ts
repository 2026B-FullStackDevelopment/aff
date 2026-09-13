import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cancelListingMock, listListingsMock } = vi.hoisted(() => ({
  cancelListingMock: vi.fn(),
  listListingsMock: vi.fn(),
}));

vi.mock('../../../src/modules/admin/admin.service.js', () => ({
  createCourier: vi.fn(),
  listCouriers: vi.fn(),
  listDeliveries: vi.fn(),
  cancelListing: cancelListingMock,
  listListings: listListingsMock,
}));

import {
  cancelListing,
  listAllListings,
} from '../../../src/modules/admin/admin.controller.js';

function responseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response as unknown as Response;
}

describe('admin.controller listing oversight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates and forwards listing search pagination', async () => {
    listListingsMock.mockResolvedValue({
      items: [{ id: 'listing-1' }],
      page: 2,
      limit: 10,
      total: 14,
    });
    const request = {
      query: { search: ' Khang ', page: '2', limit: '10' },
    } as unknown as Request;
    const response = responseMock();
    const next = vi.fn() as NextFunction;

    await listAllListings(request, response, next);

    expect(listListingsMock).toHaveBeenCalledWith({
      search: 'Khang',
      page: 2,
      limit: 10,
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      data: { items: [{ id: 'listing-1' }], page: 2, limit: 10, total: 14 },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes the validated listing and Admin ids to cancellation', async () => {
    const listingId = '507f1f77bcf86cd799439011';
    cancelListingMock.mockResolvedValue({
      listing: { id: listingId, status: 'CANCELLED' },
      cancelledOrderCount: 2,
    });
    const request = {
      params: { id: listingId },
      user: { id: 'admin-1' },
    } as unknown as Request;
    const response = responseMock();
    const next = vi.fn() as NextFunction;

    await cancelListing(request, response, next);

    expect(cancelListingMock).toHaveBeenCalledWith(listingId, 'admin-1');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      data: {
        listing: { id: listingId, status: 'CANCELLED' },
        cancelledOrderCount: 2,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid listing id before calling the service', async () => {
    const request = {
      params: { id: 'not-an-object-id' },
      user: { id: 'admin-1' },
    } as unknown as Request;
    const response = responseMock();
    const next = vi.fn() as NextFunction;

    await cancelListing(request, response, next);

    expect(cancelListingMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});
