import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findMock, createMock, findByIdMock, findByIdAndUpdateMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    findMock: vi.fn(() => ({ lean: leanMock })),
    createMock: vi.fn(),
    findByIdMock: vi.fn(() => ({ lean: leanMock })),
    findByIdAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    leanMock,
  };
});

vi.mock('../../../src/modules/listings/listing.model.js', () => ({
  default: {
    find: findMock,
    create: createMock,
    findById: findByIdMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
  },
}));

import {
  findAvailableListings,
  createListing,
  findListingById,
  updateListing,
} from '../../../src/modules/listings/listing.repository.js';

describe('listing.repository', () => {
  beforeEach(() => {
    findMock.mockClear();
    createMock.mockClear();
    findByIdMock.mockClear();
    findByIdAndUpdateMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue([{ _id: 'l1' }]);
  });

  it('findAvailableListings filters by status ACTIVE and merges extra filters', async () => {
    await findAvailableListings({ category: 'FRUIT' });

    expect(findMock).toHaveBeenCalledWith({ category: 'FRUIT', status: 'ACTIVE' });
    expect(leanMock).toHaveBeenCalled();
  });

  it('createListing calls Listing.create with the given data', async () => {
    createMock.mockResolvedValue({ _id: 'l1' });

    const result = await createListing({
      donorId: 'd1',
      name: 'Bread',
      unit: 'UNIT',
      category: 'BAKED_GOODS',
      isVegetarian: true,
      price: 0,
      donationLimit: 10,
      quantityRemaining: 10,
    });

    expect(createMock).toHaveBeenCalledWith({
      donorId: 'd1',
      name: 'Bread',
      unit: 'UNIT',
      category: 'BAKED_GOODS',
      isVegetarian: true,
      price: 0,
      donationLimit: 10,
      quantityRemaining: 10,
    });
    expect(result).toEqual({ _id: 'l1' });
  });

  it('findListingById queries by id and returns a lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'l1' });

    await findListingById('l1');

    expect(findByIdMock).toHaveBeenCalledWith('l1');
    expect(leanMock).toHaveBeenCalled();
  });

  it('updateListing updates by id and returns the new lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'l1', status: 'PAUSED' });

    await updateListing('l1', { name: 'Updated' });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith('l1', { name: 'Updated' }, { new: true });
    expect(leanMock).toHaveBeenCalled();
  });
});
