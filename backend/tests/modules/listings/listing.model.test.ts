import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import Listing from '../../../src/modules/listings/listing.model.js';

function buildListing(donationLimit: number, rationLimitPerPerson = 2) {
  return new Listing({
    donorId: new Types.ObjectId(),
    name: 'Fresh bread',
    unit: 'UNIT',
    category: 'BAKED_GOODS',
    isVegetarian: true,
    price: 0,
    status: 'ACTIVE',
    donationLimit,
    rationLimitPerPerson,
    quantityRemaining: donationLimit,
  });
}

describe('Listing model quantity limits', () => {
  it('accepts positive whole-number donation and ration limits', async () => {
    await expect(buildListing(20).validate()).resolves.toBeUndefined();
  });

  it.each([0, -1, 0.5])(
    'rejects invalid donation limit %s',
    async (donationLimit) => {
      await expect(buildListing(donationLimit).validate()).rejects.toMatchObject({
        errors: {
          donationLimit: expect.anything(),
        },
      });
    },
  );

  it.each([0, -1, 0.5])(
    'rejects invalid ration limit %s',
    async (rationLimitPerPerson) => {
      await expect(buildListing(20, rationLimitPerPerson).validate()).rejects.toMatchObject({
        errors: {
          rationLimitPerPerson: expect.anything(),
        },
      });
    },
  );
});
