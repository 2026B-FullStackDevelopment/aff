import { describe, expect, it } from 'vitest';
import {
  toListingResponseDto,
  toListingDetailResponseDto,
  toListingWithStatsResponseDto,
} from '../../../src/modules/listings/listing.response.dto.js';
import type {
  ListingDtoSource,
  ListingWithStatsDtoSource,
} from '../../../src/modules/listings/listing.response.dto.js';

function createListingSource(): ListingDtoSource {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-01T00:00:00.000Z');

  return {
    listing: {
      _id: 'listing-1',
      donorId: 'donor-1',
      name: 'Fresh Bread',
      description: undefined,
      imageUrl: undefined,
      unit: 'UNIT',
      category: 'BAKED_GOODS',
      isVegetarian: true,
      price: 0,
      city: 'Hanoi',
      status: 'ACTIVE',
      donationLimit: 10,
      rationLimitPerPerson: undefined,
      quantityRemaining: 8,
      createdAt,
      updatedAt,
    },
    donor: {
      id: 'donor-1',
      companyName: 'Fresh Bakery',
      city: 'Hanoi',
      addressText: '123 Example Street, Hanoi',
      location: {
        latitude: 21.0278,
        longitude: 105.8342,
        updatedAt,
      },
    },
  } as unknown as ListingDtoSource;
}

describe('listing DTO mappers', () => {
  describe('toListingResponseDto', () => {
    it('returns null when given null', () => {
      expect(toListingResponseDto(null)).toBeNull();
    });

    it('maps an enriched Listing to the documented ListingDTO', () => {
      const source = createListingSource();

      expect(toListingResponseDto(source)).toEqual({
        id: 'listing-1',
        donor: {
          id: 'donor-1',
          companyName: 'Fresh Bakery',
          city: 'Hanoi',
          location: {
            latitude: 21.0278,
            longitude: 105.8342,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
        name: 'Fresh Bread',
        description: null,
        imageUrl: null,
        unit: 'UNIT',
        category: 'BAKED_GOODS',
        isVegetarian: true,
        price: 0,
        city: 'Hanoi',
        status: 'ACTIVE',
        donationLimit: 10,
        rationLimitPerPerson: null,
        quantityRemaining: 8,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('uses the Donor city when the Listing city is missing', () => {
      const source = createListingSource();
      source.listing.city = undefined;

      expect(toListingResponseDto(source)?.city).toBe('Hanoi');
    });
  });

  describe('toListingDetailResponseDto', () => {
    it('returns null when given null', () => {
      expect(toListingDetailResponseDto(null)).toBeNull();
    });

    it('includes the Donor address and location in Listing details', () => {
      const source = createListingSource();
      const result = toListingDetailResponseDto(source);

      expect(result?.donor).toEqual({
        id: 'donor-1',
        companyName: 'Fresh Bakery',
        addressText: '123 Example Street, Hanoi',
        location: {
          latitude: 21.0278,
          longitude: 105.8342,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
    });
  });

  describe('toListingWithStatsResponseDto', () => {
    it('includes calculated donated quantity and revenue', () => {
      const source: ListingWithStatsDtoSource = {
        ...createListingSource(),
        donatedQuantity: 2,
        revenue: 5000,
      };

      const result = toListingWithStatsResponseDto(source);

      expect(result.donatedQuantity).toBe(2);
      expect(result.revenue).toBe(5000);

      expect(result.donor).toEqual({
        id: 'donor-1',
        companyName: 'Fresh Bakery',
        city: 'Hanoi',
        location: {
          latitude: 21.0278,
          longitude: 105.8342,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
    });
  });
});
