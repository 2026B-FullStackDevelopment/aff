import { describe, it, expect } from 'vitest';
import { toListingResponseDto } from '../../../src/modules/listings/listing.dto.js';

describe('toListingResponseDto', () => {
  it('returns null when given null', () => {
    expect(toListingResponseDto(null)).toBeNull();
  });

  it('maps a listing document to the documented ListingDTO shape, with a partial donor summary', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const listing = {
      _id: 'l1',
      donorId: 'd1',
      name: 'Bread',
      description: 'Fresh bread',
      imageUrl: null,
      unit: 'UNIT',
      category: 'BAKED_GOODS',
      isVegetarian: true,
      price: 0,
      city: 'Hanoi',
      status: 'ACTIVE',
      donationLimit: 10,
      rationLimitPerPerson: 2,
      quantityRemaining: 8,
      createdAt,
    };

    expect(toListingResponseDto(listing)).toEqual({
      id: 'l1',
      donor: {
        id: 'd1',
        companyName: undefined,
        city: 'Hanoi',
        location: undefined,
      },
      name: 'Bread',
      description: 'Fresh bread',
      imageUrl: null,
      unit: 'UNIT',
      category: 'BAKED_GOODS',
      isVegetarian: true,
      price: 0,
      city: 'Hanoi',
      status: 'ACTIVE',
      donationLimit: 10,
      rationLimitPerPerson: 2,
      quantityRemaining: 8,
      createdAt,
    });
  });
});
