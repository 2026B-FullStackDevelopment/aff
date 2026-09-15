import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createMock,
  findByIdAndUpdateMock,
  findOneAndUpdateMock,
  leanMock,
} = vi.hoisted(() => {
  const lean = vi.fn();

  return {
    createMock: vi.fn(),
    findByIdAndUpdateMock: vi.fn(() => ({ lean })),
    findOneAndUpdateMock: vi.fn(() => ({ lean })),
    leanMock: lean,
  };
});

vi.mock('../../../src/modules/listings/listing.model.js', () => ({
  default: {
    create: createMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import {
  createListing,
  updateListing,
  updateListingStatusIfCurrent,
} from '../../../src/modules/listings/listing.command.repository.js';

describe('listing.command.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a Listing with the supplied data', async () => {
    createMock.mockResolvedValue({ _id: 'l1' });
    const data = {
      donorId: 'd1',
      name: 'Bread',
      unit: 'UNIT' as const,
      category: 'BAKED_GOODS' as const,
      isVegetarian: true,
      price: 0,
      donationLimit: 10,
      quantityRemaining: 10,
    };

    await expect(createListing(data)).resolves.toEqual({ _id: 'l1' });
    expect(createMock).toHaveBeenCalledWith(data);
  });

  it('updates a Listing by id and returns the new lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'l1', name: 'Updated' });

    await updateListing('l1', { name: 'Updated' });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      'l1',
      { name: 'Updated' },
      { new: true },
    );
    expect(leanMock).toHaveBeenCalled();
  });

  it('changes status only for the expected Donor, Listing and current status', async () => {
    const closedAt = new Date('2026-09-13T00:00:00.000Z');
    const session = { id: 'session' };
    leanMock.mockResolvedValue({ _id: 'l1', status: 'CANCELLED' });

    await updateListingStatusIfCurrent(
      'l1',
      'd1',
      'ACTIVE',
      'CANCELLED',
      { closedAt, session: session as never },
    );

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: 'l1', donorId: 'd1', status: 'ACTIVE' },
      { $set: { status: 'CANCELLED', closedAt } },
      {
        new: true,
        runValidators: true,
        session,
      },
    );
    expect(leanMock).toHaveBeenCalled();
  });

  it('does not write closedAt when no close timestamp is supplied', async () => {
    await updateListingStatusIfCurrent('l1', 'd1', 'PAUSED', 'ACTIVE');

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: 'l1', donorId: 'd1', status: 'PAUSED' },
      { $set: { status: 'ACTIVE' } },
      {
        new: true,
        runValidators: true,
        session: undefined,
      },
    );
  });
});
