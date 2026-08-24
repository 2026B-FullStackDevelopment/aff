import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findAvailableListingsMock,
  createListingMock,
  findListingByIdMock,
  getUserByIdMock,
  getDonorByUserIdMock,
} = vi.hoisted(() => ({
  findAvailableListingsMock: vi.fn(),
  createListingMock: vi.fn(),
  findListingByIdMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  getDonorByUserIdMock: vi.fn(),
}));

vi.mock('../../../src/modules/listings/listing.repository.js', () => ({
  findAvailableListings: findAvailableListingsMock,
  createListing: createListingMock,
  findListingById: findListingByIdMock,
}));
// replace real User module with test mocks, prevent tests from affecting database
vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    getUserById: getUserByIdMock,
    getDonorByUserId: getDonorByUserIdMock,
  },
}));

// import real listing service functions to test
import { listAvailableListings, createListing, getListingById } from '../../../src/modules/listings/listing.service.js';

// reusable example location, one shared object keeps test data consistent
const location = {
  latitude: 21.0278,
  longitude: 105.8342,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function prepareDonorMocks() {
  getUserByIdMock.mockResolvedValue({
    _id: 'd1',
    city: 'Hanoi',
  });

  getDonorByUserIdMock.mockResolvedValue({
    userId: 'd1',
    companyName: 'Fresh Bakery',
    taxCode: 'TAX-123',
    addressText: '123 Example Street, Hanoi',
    location,
  });
}

// group all tests together
describe('listing.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAvailableListings', () => {
    it('delegates to the repository and enriches Listings with Donor data', async () => {
      const listing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        city: 'Hanoi',
      };

      findAvailableListingsMock.mockResolvedValue([listing]);
      prepareDonorMocks();

      const result = await listAvailableListings({ category: 'FRUIT' });

      expect(findAvailableListingsMock).toHaveBeenCalledWith({ category: 'FRUIT' });
      expect(getUserByIdMock).toHaveBeenCalledWith('d1');
      expect(getDonorByUserIdMock).toHaveBeenCalledWith('d1');
      expect(result).toEqual([
        {
          listing,
          donor: {
            id: 'd1',
            companyName: 'Fresh Bakery',
            city: 'Hanoi',
            addressText: '123 Example Street, Hanoi',
            location,
          },
        },
      ]);
    });

    it('returns an empty array without performing Donor lookups', async () => {
      findAvailableListingsMock.mockResolvedValue([]);

      const result = await listAvailableListings();

      expect(findAvailableListingsMock).toHaveBeenCalledWith({});
      expect(getUserByIdMock).not.toHaveBeenCalled();
      expect(getDonorByUserIdMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('createListing', () => {
    it('fetches the donor, maps the payload, and defaults quantityRemaining to donationLimit', async () => {
      const createdListing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        city: 'Hanoi',
      };

      prepareDonorMocks();
      createListingMock.mockResolvedValue(createdListing);

      const result = await createListing('d1', {
        name: 'Bread',
        unit: 'UNIT',
        category: 'BAKED_GOODS',
        isVegetarian: true,
        price: 0,
        donationLimit: 10,
      });

      expect(getUserByIdMock).toHaveBeenCalledWith('d1');
      expect(getDonorByUserIdMock).toHaveBeenCalledWith('d1');
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

      expect(result).toEqual({
        listing: createdListing,
        donor: {
          id: 'd1',
          companyName: 'Fresh Bakery',
          city: 'Hanoi',
          addressText: '123 Example Street, Hanoi',
          location,
        },
      });
    });

    it('copies optional Listing fields into the repository input', async () => {
      prepareDonorMocks();
      createListingMock.mockResolvedValue({
        _id: 'l1',
        donorId: 'd1',
      });

      await createListing('d1', {
        name: 'Vegetable Box',
        description: 'A box of vegetables',
        imageUrl: 'https://example.com/vegetables.jpg',
        unit: 'KILOGRAM',
        category: 'VEGETABLE',
        isVegetarian: true,
        price: 5000,
        donationLimit: 20,
        rationLimitPerPerson: 2,
      });

      expect(createListingMock).toHaveBeenCalledWith({
        donorId: 'd1',
        name: 'Vegetable Box',
        description: 'A box of vegetables',
        imageUrl: 'https://example.com/vegetables.jpg',
        unit: 'KILOGRAM',
        category: 'VEGETABLE',
        isVegetarian: true,
        price: 5000,
        city: 'Hanoi',
        donationLimit: 20,
        rationLimitPerPerson: 2,
        quantityRemaining: 20,
      });
    });

    it('rejects creation when the Donor city is missing', async () => {
      getUserByIdMock.mockResolvedValue({
        _id: 'd1',
        city: undefined,
      });
      getDonorByUserIdMock.mockResolvedValue({
        userId: 'd1',
        companyName: 'Fresh Bakery',
        addressText: '123 Example Street, Hanoi',
        location,
      });

      await expect(
        createListing('d1', {
          name: 'Bread',
          unit: 'UNIT',
          category: 'BAKED_GOODS',
          isVegetarian: true,
          price: 0,
          donationLimit: 10,
        }),
      ).rejects.toMatchObject({
        message: 'Donor city is missing.',
        statusCode: 500,
      });

      expect(createListingMock).not.toHaveBeenCalled();
    });
  });

  describe('getListingById', () => {
    it('returns null without Donor lookups when the Listing does not exist', async () => {
      findListingByIdMock.mockResolvedValue(null);

      const result = await getListingById('missing-listing');

      expect(findListingByIdMock).toHaveBeenCalledWith('missing-listing');
      expect(getUserByIdMock).not.toHaveBeenCalled();
      expect(getDonorByUserIdMock).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('delegates to the repository and enriches the Listing with Donor data', async () => {
      const listing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        city: 'Hanoi',
      };

      findListingByIdMock.mockResolvedValue(listing);
      prepareDonorMocks();

      const result = await getListingById('l1');

      expect(findListingByIdMock).toHaveBeenCalledWith('l1');
      expect(getUserByIdMock).toHaveBeenCalledWith('d1');
      expect(getDonorByUserIdMock).toHaveBeenCalledWith('d1');
      expect(result).toEqual({
        listing,
        donor: {
          id: 'd1',
          companyName: 'Fresh Bakery',
          city: 'Hanoi',
          addressText: '123 Example Street, Hanoi',
          location,
        },
      });
    });
  });
});
