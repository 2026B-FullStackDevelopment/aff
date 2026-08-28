import { describe, expect, it } from 'vitest';
import {
  createListingSchema,
  donorInitiatedDonationSchema,
  foodCategorySchema,
  listingIdParamsSchema,
  listingOrdersQuerySchema,
  listingPriceSchema,
  listingsQuerySchema,
  measurementUnitSchema,
  mineListingsQuerySchema,
  paginationQuerySchema,
  paymentMethodSchema,
  positiveQuantitySchema,
  updateListingStatusSchema,
} from '../../../src/modules/listings/listing.schemas.js';

const validListing = {
  name: 'Fresh bread',
  description: 'Baked this morning',
  imageUrl: 'https://example.com/listings/bread.jpg',
  unit: 'UNIT',
  category: 'BAKED_GOODS',
  isVegetarian: true,
  price: 0,
  donationLimit: 20,
  rationLimitPerPerson: 2,
};

describe('listing.schemas', () => {
  describe('supported enums', () => {
    it.each(['KILOGRAM', 'GRAM', 'LITER', 'MILLILITER', 'UNIT', 'PER_REQUEST'])(
      'accepts measurement unit %s',
      (unit) => {
        expect(measurementUnitSchema.safeParse(unit).success).toBe(true);
      },
    );

    it('rejects an unsupported measurement unit', () => {
      expect(measurementUnitSchema.safeParse('BOX').success).toBe(false);
    });

    it.each(['FRUIT', 'VEGETABLE', 'MEAT', 'COOKED_DISH', 'BAKED_GOODS', 'DRINK'])(
      'accepts food category %s',
      (category) => {
        expect(foodCategorySchema.safeParse(category).success).toBe(true);
      },
    );

    it('rejects an unsupported food category', () => {
      expect(foodCategorySchema.safeParse('SEAFOOD').success).toBe(false);
    });

    it.each(['STRIPE', 'CASH'])('accepts payment method %s', (paymentMethod) => {
      expect(paymentMethodSchema.safeParse(paymentMethod).success).toBe(true);
    });

    it('rejects an unsupported payment method', () => {
      expect(paymentMethodSchema.safeParse('BANK_TRANSFER').success).toBe(false);
    });
  });

  describe('listingPriceSchema', () => {
    it.each([0, 1001, 1500, 2000, 2500])('accepts price %s', (price) => {
      expect(listingPriceSchema.safeParse(price).success).toBe(true);
    });

    it.each([-100, 1, 500, 1000])('rejects price %s', (price) => {
      expect(listingPriceSchema.safeParse(price).success).toBe(false);
    });

    it('rejects a numeric string', () => {
      expect(listingPriceSchema.safeParse('2000').success).toBe(false);
    });

    it('rejects a non-finite price', () => {
      expect(listingPriceSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    });
  });

  describe('positiveQuantitySchema', () => {
    it.each([0.5, 1, 20])('accepts positive quantity %s', (quantity) => {
      expect(positiveQuantitySchema.safeParse(quantity).success).toBe(true);
    });

    it.each([0, -1, Number.POSITIVE_INFINITY])('rejects quantity %s', (quantity) => {
      expect(positiveQuantitySchema.safeParse(quantity).success).toBe(false);
    });

    it('rejects a numeric string', () => {
      expect(positiveQuantitySchema.safeParse('2').success).toBe(false);
    });
  });

  describe('createListingSchema', () => {
    it('accepts a complete valid listing body', () => {
      expect(createListingSchema.safeParse(validListing).success).toBe(true);
    });

    it('accepts a valid body without optional fields', () => {
      const result = createListingSchema.safeParse({
        name: 'Rice',
        unit: 'KILOGRAM',
        category: 'COOKED_DISH',
        isVegetarian: true,
        price: 0,
        donationLimit: 10,
      });

      expect(result.success).toBe(true);
    });

    it('trims text fields', () => {
      const parsed = createListingSchema.parse({
        ...validListing,
        name: '  Fresh bread  ',
        description: '  Baked today  ',
      });

      expect(parsed.name).toBe('Fresh bread');
      expect(parsed.description).toBe('Baked today');
    });

    it('accepts a per-request listing', () => {
      expect(
        createListingSchema.safeParse({ ...validListing, unit: 'PER_REQUEST' }).success,
      ).toBe(true);
    });

    it('rejects an empty name', () => {
      expect(createListingSchema.safeParse({ ...validListing, name: '   ' }).success).toBe(false);
    });

    it('rejects an invalid image URL', () => {
      expect(
        createListingSchema.safeParse({ ...validListing, imageUrl: 'not-a-url' }).success,
      ).toBe(false);
    });

    it('rejects an invalid unit', () => {
      expect(createListingSchema.safeParse({ ...validListing, unit: 'BOX' }).success).toBe(false);
    });

    it('rejects an invalid category', () => {
      expect(
        createListingSchema.safeParse({ ...validListing, category: 'SEAFOOD' }).success,
      ).toBe(false);
    });

    it('rejects a non-boolean vegetarian value', () => {
      expect(
        createListingSchema.safeParse({ ...validListing, isVegetarian: 'yes' }).success,
      ).toBe(false);
    });

    it.each([0, -1])('rejects donation limit %s', (donationLimit) => {
      expect(createListingSchema.safeParse({ ...validListing, donationLimit }).success).toBe(false);
    });

    it.each([0, -1])('rejects ration limit %s', (rationLimitPerPerson) => {
      expect(
        createListingSchema.safeParse({ ...validListing, rationLimitPerPerson }).success,
      ).toBe(false);
    });

    it('rejects server-controlled and unknown fields', () => {
      expect(
        createListingSchema.safeParse({
          ...validListing,
          donorId: '507f1f77bcf86cd799439011',
          status: 'SOLD_OUT',
          quantityRemaining: 999,
        }).success,
      ).toBe(false);
    });
  });

  describe('paginationQuerySchema', () => {
    it('applies the documented pagination defaults', () => {
      expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    });

    it('coerces string query parameters to numbers', () => {
      expect(paginationQuerySchema.parse({ page: '2', limit: '50' })).toEqual({
        page: 2,
        limit: 50,
      });
    });

    it.each([
      { page: '0' },
      { page: '-1' },
      { page: '1.5' },
      { page: 'not-a-number' },
      { limit: '0' },
      { limit: '101' },
      { limit: '1.5' },
    ])('rejects invalid pagination %o', (query) => {
      expect(paginationQuerySchema.safeParse(query).success).toBe(false);
    });
  });

  describe('mineListingsQuerySchema', () => {
    it('accepts all supported filters and applies pagination defaults', () => {
      const parsed = mineListingsQuerySchema.parse({
        status: 'ACTIVE',
        search: '  bread  ',
        category: 'BAKED_GOODS',
        from: '2026-08-01',
        to: '2026-08-20',
        sort: 'revenue',
        order: 'desc',
      });

      expect(parsed).toEqual({
        status: 'ACTIVE',
        search: 'bread',
        category: 'BAKED_GOODS',
        from: '2026-08-01',
        to: '2026-08-20',
        sort: 'revenue',
        order: 'desc',
        page: 1,
        limit: 20,
      });
    });

    it.each(['ACTIVE', 'PAST'])('accepts status grouping %s', (status) => {
      expect(mineListingsQuerySchema.safeParse({ status }).success).toBe(true);
    });

    it('rejects a missing status grouping', () => {
      expect(mineListingsQuerySchema.safeParse({}).success).toBe(false);
    });

    it('rejects an invalid status grouping', () => {
      expect(mineListingsQuerySchema.safeParse({ status: 'SOLD_OUT' }).success).toBe(false);
    });

    it('rejects an invalid category', () => {
      expect(
        mineListingsQuerySchema.safeParse({ status: 'ACTIVE', category: 'SEAFOOD' }).success,
      ).toBe(false);
    });

    it('rejects unsupported sort and order values', () => {
      expect(
        mineListingsQuerySchema.safeParse({
          status: 'ACTIVE',
          sort: 'name',
          order: 'newest',
        }).success,
      ).toBe(false);
    });

    it('rejects an invalid date', () => {
      expect(
        mineListingsQuerySchema.safeParse({ status: 'ACTIVE', from: 'not-a-date' }).success,
      ).toBe(false);
    });

    it('rejects a from date later than the to date', () => {
      expect(
        mineListingsQuerySchema.safeParse({
          status: 'PAST',
          from: '2026-08-21',
          to: '2026-08-20',
        }).success,
      ).toBe(false);
    });

    it('rejects unknown query parameters', () => {
      expect(
        mineListingsQuerySchema.safeParse({ status: 'ACTIVE', donorId: 'someone-else' }).success,
      ).toBe(false);
    });
  });

  describe('listingsQuerySchema', () => {
    it('applies the documented pagination defaults', () => {
      expect(listingsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    });

    it('coerces string query parameters to numbers', () => {
      expect(listingsQuerySchema.parse({ page: '2', limit: '50' })).toEqual({
        page: 2,
        limit: 50,
      });
    });

    it.each(['rank', 'lat', 'lng', 'status'])(
      'rejects an unknown query parameter (%s) — status is always server-controlled, and rank/lat/lng are Epic F fields',
      (key) => {
        expect(
          listingsQuerySchema.safeParse({ [key]: 'anything' }).success,
        ).toBe(false);
      },
    );

    it.each([
      { page: '0' },
      { page: '-1' },
      { page: '1.5' },
      { limit: '0' },
      { limit: '101' },
    ])('rejects invalid pagination %o', (query) => {
      expect(listingsQuerySchema.safeParse(query).success).toBe(false);
    });

    it('accepts all supported D6 filter/sort fields together', () => {
      const parsed = listingsQuerySchema.parse({
        search: '  bread  ',
        city: '  Thành phố Hà Nội  ',
        category: 'BAKED_GOODS',
        priceMin: '1000',
        priceMax: '5000',
        sort: 'price',
        order: 'asc',
      });

      expect(parsed).toEqual({
        search: 'bread',
        city: 'Thành phố Hà Nội',
        category: 'BAKED_GOODS',
        priceMin: 1000,
        priceMax: 5000,
        sort: 'price',
        order: 'asc',
        page: 1,
        limit: 20,
      });
    });

    it('accepts a query with only some filters supplied', () => {
      expect(listingsQuerySchema.safeParse({ search: 'bread' }).success).toBe(true);
      expect(listingsQuerySchema.safeParse({ city: 'Thành phố Hà Nội' }).success).toBe(true);
      expect(listingsQuerySchema.safeParse({ priceMin: '1000' }).success).toBe(true);
    });

    it('rejects an invalid category', () => {
      expect(listingsQuerySchema.safeParse({ category: 'SEAFOOD' }).success).toBe(false);
    });

    it('rejects an unsupported sort field', () => {
      expect(listingsQuerySchema.safeParse({ sort: 'createdAt' }).success).toBe(false);
    });

    it('rejects an unsupported order value', () => {
      expect(listingsQuerySchema.safeParse({ order: 'newest' }).success).toBe(false);
    });

    it.each([-1, -100])('rejects a negative priceMin/priceMax %s', (price) => {
      expect(listingsQuerySchema.safeParse({ priceMin: price }).success).toBe(false);
      expect(listingsQuerySchema.safeParse({ priceMax: price }).success).toBe(false);
    });

    it('rejects a priceMin greater than priceMax', () => {
      expect(
        listingsQuerySchema.safeParse({ priceMin: 5000, priceMax: 1000 }).success,
      ).toBe(false);
    });

    it('accepts priceMin equal to priceMax', () => {
      expect(
        listingsQuerySchema.safeParse({ priceMin: 2000, priceMax: 2000 }).success,
      ).toBe(true);
    });
  });

  describe('listingIdParamsSchema', () => {
    it('accepts a valid MongoDB ObjectId', () => {
      expect(
        listingIdParamsSchema.safeParse({ id: '507f1f77bcf86cd799439011' }).success,
      ).toBe(true);
    });

    it.each(['short-id', '507f1f77bcf86cd79943901z', ''])('rejects listing ID %s', (id) => {
      expect(listingIdParamsSchema.safeParse({ id }).success).toBe(false);
    });

    it('rejects missing and extra parameters', () => {
      expect(listingIdParamsSchema.safeParse({}).success).toBe(false);
      expect(
        listingIdParamsSchema.safeParse({
          id: '507f1f77bcf86cd799439011',
          userId: '507f191e810c19729de860ea',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateListingStatusSchema', () => {
    it.each(['PAUSED', 'ACTIVE', 'CANCELLED'])('accepts status %s', (status) => {
      expect(updateListingStatusSchema.safeParse({ status }).success).toBe(true);
    });

    it.each(['SOLD_OUT', 'DELETED', 'paused'])('rejects client status %s', (status) => {
      expect(updateListingStatusSchema.safeParse({ status }).success).toBe(false);
    });

    it('rejects additional fields', () => {
      expect(
        updateListingStatusSchema.safeParse({ status: 'PAUSED', donorId: 'other-user' }).success,
      ).toBe(false);
    });
  });

  // describe() groups related test cases.
  describe('donorInitiatedDonationSchema', () => {
    const validDonationBody = {
      recipientEmail: 'recipient@example.com',
      quantity: 2,
      deliveryAddressText: '123 Example Street, Ho Chi Minh City',
      deliveryLocation: {
        latitude: 10.7769,
        longitude: 106.7009,
      },
    };

    it('accepts a valid donor-initiated donation body', () => {
      expect(
        donorInitiatedDonationSchema.safeParse(validDonationBody).success,
      ).toBe(true);
    });

    it('trims and lowercases the recipient email', () => {
      const parsed = donorInitiatedDonationSchema.parse({
        ...validDonationBody,
        recipientEmail: '  Recipient@Example.COM  ',
      });

      expect(parsed.recipientEmail).toBe('recipient@example.com');
    });

    it('trims the delivery address', () => {
      const parsed = donorInitiatedDonationSchema.parse({
        ...validDonationBody,
        deliveryAddressText: '  123 Example Street  ',
      });

      expect(parsed.deliveryAddressText).toBe('123 Example Street');
    });

    it('rejects a malformed recipient email', () => {
      expect(
        donorInitiatedDonationSchema.safeParse({
          ...validDonationBody,
          recipientEmail: 'not-an-email',
        }).success,
      ).toBe(false);
    });

    it.each([0, -1])('rejects donation quantity %s', (quantity) => {
      expect(
        donorInitiatedDonationSchema.safeParse({
          ...validDonationBody,
          quantity,
        }).success,
      ).toBe(false);
    });

    it('rejects a missing delivery address', () => {
      const {
        deliveryAddressText: _deliveryAddressText,
        ...bodyWithoutAddress
      } = validDonationBody;

      expect(
        donorInitiatedDonationSchema.safeParse(bodyWithoutAddress).success,
      ).toBe(false);
    });

    it('rejects an empty delivery address', () => {
      expect(
        donorInitiatedDonationSchema.safeParse({
          ...validDonationBody,
          deliveryAddressText: '   ',
        }).success,
      ).toBe(false);
    });

    it('rejects an invalid latitude', () => {
      expect(
        donorInitiatedDonationSchema.safeParse({
          ...validDonationBody,
          deliveryLocation: {
            latitude: 91,
            longitude: 106.7009,
          },
        }).success,
      ).toBe(false);
    });

    it('rejects an invalid longitude', () => {
      expect(
        donorInitiatedDonationSchema.safeParse({
          ...validDonationBody,
          deliveryLocation: {
            latitude: 10.7769,
            longitude: 181,
          },
        }).success,
      ).toBe(false);
    });

    it('rejects paymentMethod because the Recipient chooses it later', () => {
      expect(
        donorInitiatedDonationSchema.safeParse({
          ...validDonationBody,
          paymentMethod: 'CASH',
        }).success,
      ).toBe(false);
    });

    it('rejects additional fields', () => {
      expect(
        donorInitiatedDonationSchema.safeParse({
          ...validDonationBody,
          recipientName: 'Recipient',
        }).success,
      ).toBe(false);
    });
  });

  describe('listingOrdersQuerySchema', () => {
    it('applies pagination defaults', () => {
      expect(listingOrdersQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    });

    it('accepts and coerces valid pagination', () => {
      expect(listingOrdersQuerySchema.parse({ page: '3', limit: '100' })).toEqual({
        page: 3,
        limit: 100,
      });
    });

    it('rejects invalid or additional pagination values', () => {
      expect(listingOrdersQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
      expect(listingOrdersQuerySchema.safeParse({ page: '1', search: 'bread' }).success).toBe(false);
    });
  });
});
