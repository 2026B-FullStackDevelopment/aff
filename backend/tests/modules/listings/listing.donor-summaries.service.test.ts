import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findListingsByIdsMock, findDonorsByUserIdsMock } = vi.hoisted(() => ({
  findListingsByIdsMock: vi.fn(),
  findDonorsByUserIdsMock: vi.fn(),
}));

vi.mock('../../../src/modules/listings/listing.query.repository.js', () => ({
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

import { findDonorSummariesByListingIds } from '../../../src/modules/listings/listing.query.service.js';

describe('listing.query.service.findDonorSummariesByListingIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const donorFixture = (userId: string, companyName: string) => ({
    userId,
    companyName,
    addressText: `${companyName} warehouse`,
    location: { latitude: 21, longitude: 105, updatedAt: new Date() },
  });

  it('maps each Listing to its name, Donor company name and pickup address/location', async () => {
    findListingsByIdsMock.mockResolvedValue([
      { _id: 'l1', donorId: 'd1', name: 'Sourdough loaves' },
      { _id: 'l2', donorId: 'd2', name: 'Canned soup' },
    ]);
    const first = donorFixture('d1', 'First Donor');
    const second = donorFixture('d2', 'Second Donor');
    findDonorsByUserIdsMock.mockResolvedValue([second, first]);

    const result = await findDonorSummariesByListingIds(['l1', 'l2']);

    expect(result).toEqual([
      {
        listingId: 'l1',
        listingName: 'Sourdough loaves',
        companyName: 'First Donor',
        addressText: first.addressText,
        location: first.location,
      },
      {
        listingId: 'l2',
        listingName: 'Canned soup',
        companyName: 'Second Donor',
        addressText: second.addressText,
        location: second.location,
      },
    ]);
  });

  it('asks for each Donor once when several Listings share one', async () => {
    findListingsByIdsMock.mockResolvedValue([
      { _id: 'l1', donorId: 'd1', name: 'Sourdough loaves' },
      { _id: 'l2', donorId: 'd1', name: 'Canned soup' },
    ]);
    findDonorsByUserIdsMock.mockResolvedValue([donorFixture('d1', 'First Donor')]);

    await findDonorSummariesByListingIds(['l1', 'l2']);

    expect(findDonorsByUserIdsMock).toHaveBeenCalledWith(['d1']);
  });

  it('omits a Listing whose Donor profile is missing', async () => {
    findListingsByIdsMock.mockResolvedValue([
      { _id: 'l1', donorId: 'd1', name: 'Sourdough loaves' },
    ]);
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
