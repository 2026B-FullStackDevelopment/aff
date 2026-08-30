import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findListingsByIdsMock, findDonorsByUserIdsMock } = vi.hoisted(() => ({
  findListingsByIdsMock: vi.fn(),
  findDonorsByUserIdsMock: vi.fn(),
}));

vi.mock('../../../src/modules/listings/listing.repository.js', () => ({
  findListingsByIds: findListingsByIdsMock,
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: { findDonorsByUserIds: findDonorsByUserIdsMock },
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {},
}));

vi.mock('../../../src/modules/delivery/delivery.interface.js', () => ({
  deliveryInterface: {},
}));

vi.mock('../../../src/realtime/socket.js', () => ({
  emitToUser: vi.fn(),
  emitToOrder: vi.fn(),
}));

import { findDonorSummariesByListingIds } from '../../../src/modules/listings/listing.service.js';

describe('listing.service.findDonorSummariesByListingIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps each Listing to its Donor company name', async () => {
    findListingsByIdsMock.mockResolvedValue([
      { _id: 'l1', donorId: 'd1' },
      { _id: 'l2', donorId: 'd2' },
    ]);
    findDonorsByUserIdsMock.mockResolvedValue([
      { userId: 'd2', companyName: 'Second Donor' },
      { userId: 'd1', companyName: 'First Donor' },
    ]);

    const result = await findDonorSummariesByListingIds(['l1', 'l2']);

    expect(result).toEqual([
      { listingId: 'l1', companyName: 'First Donor' },
      { listingId: 'l2', companyName: 'Second Donor' },
    ]);
  });

  it('asks for each Donor once when several Listings share one', async () => {
    findListingsByIdsMock.mockResolvedValue([
      { _id: 'l1', donorId: 'd1' },
      { _id: 'l2', donorId: 'd1' },
    ]);
    findDonorsByUserIdsMock.mockResolvedValue([
      { userId: 'd1', companyName: 'First Donor' },
    ]);

    await findDonorSummariesByListingIds(['l1', 'l2']);

    expect(findDonorsByUserIdsMock).toHaveBeenCalledWith(['d1']);
  });

  it('omits a Listing whose Donor profile is missing', async () => {
    findListingsByIdsMock.mockResolvedValue([{ _id: 'l1', donorId: 'd1' }]);
    findDonorsByUserIdsMock.mockResolvedValue([]);

    const result = await findDonorSummariesByListingIds(['l1']);

    expect(result).toEqual([]);
  });

  it('skips both queries when asked for nothing', async () => {
    const result = await findDonorSummariesByListingIds([]);

    expect(findListingsByIdsMock).not.toHaveBeenCalled();
    expect(findDonorsByUserIdsMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
