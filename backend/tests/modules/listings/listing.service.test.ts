import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findAvailableListingsMock, createListingMock, findListingByIdMock, getUserByIdMock } = vi.hoisted(() => ({
  findAvailableListingsMock: vi.fn(),
  createListingMock: vi.fn(),
  findListingByIdMock: vi.fn(),
  getUserByIdMock: vi.fn(),
}));

vi.mock('../../../src/modules/listings/listing.repository.js', () => ({
  findAvailableListings: findAvailableListingsMock,
  createListing: createListingMock,
  findListingById: findListingByIdMock,
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    getUserById: getUserByIdMock,
  },
}));

import { listAvailableListings, createListing, getListingById } from '../../../src/modules/listings/listing.service.js';

describe('listing.service', () => {
  beforeEach(() => {
    findAvailableListingsMock.mockClear();
    createListingMock.mockClear();
    findListingByIdMock.mockClear();
    getUserByIdMock.mockClear();
  });

  describe('listAvailableListings', () => {
    it('delegates to the repository', async () => {
      findAvailableListingsMock.mockResolvedValue([{ _id: 'l1' }]);

      const result = await listAvailableListings({ category: 'FRUIT' });

      expect(findAvailableListingsMock).toHaveBeenCalledWith({ category: 'FRUIT' });
      expect(result).toEqual([{ _id: 'l1' }]);
    });
  });

  describe('createListing', () => {
    it('fetches the donor, maps the payload, and defaults quantityRemaining to donationLimit', async () => {
      getUserByIdMock.mockResolvedValue({ _id: 'd1', city: 'Hanoi' });
      createListingMock.mockResolvedValue({ _id: 'l1' });

      await createListing('d1', {
        name: 'Bread',
        unit: 'UNIT',
        category: 'BAKED_GOODS',
        isVegetarian: true,
        price: 0,
        donationLimit: 10,
      });

      expect(getUserByIdMock).toHaveBeenCalledWith('d1');
      expect(createListingMock).toHaveBeenCalledWith({
        donorId: 'd1',
        name: 'Bread',
        description: undefined,
        imageUrl: undefined,
        unit: 'UNIT',
        category: 'BAKED_GOODS',
        isVegetarian: true,
        price: 0,
        city: 'Hanoi',
        donationLimit: 10,
        rationLimitPerPerson: undefined,
        quantityRemaining: 10,
      });
    });
  });

  describe('getListingById', () => {
    it('delegates to the repository', async () => {
      findListingByIdMock.mockResolvedValue({ _id: 'l1' });

      const result = await getListingById('l1');

      expect(findListingByIdMock).toHaveBeenCalledWith('l1');
      expect(result).toEqual({ _id: 'l1' });
    });
  });
});
