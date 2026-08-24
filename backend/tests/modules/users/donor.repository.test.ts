import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, findOneMock, findOneAndUpdateMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    createMock: vi.fn(),
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    leanMock,
  };
});

vi.mock('../../../src/modules/users/donor.model.js', () => ({
  default: { create: createMock, findOne: findOneMock, findOneAndUpdate: findOneAndUpdateMock },
}));

import { createDonor, findDonorByUserId, updateDonor } from '../../../src/modules/users/donor.repository.js';

const input = {
  userId: 'u1',
  companyName: 'Fresh Foods Ltd',
  taxCode: '0123456789',
  addressText: '12 Trần Hưng Đạo, Hà Nội',
  location: { latitude: 21.0278, longitude: 105.8342 },
};

describe('donor.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
    findOneAndUpdateMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue({ userId: 'u1' });
  });

  it('createDonor persists the profile fields', async () => {
    createMock.mockResolvedValue({ userId: 'u1' });

    await createDonor(input);

    const persisted = createMock.mock.calls[0][0];

    expect(persisted.userId).toBe('u1');
    expect(persisted.companyName).toBe('Fresh Foods Ltd');
    expect(persisted.taxCode).toBe('0123456789');
    expect(persisted.addressText).toBe('12 Trần Hưng Đạo, Hà Nội');
    expect(persisted.location.latitude).toBe(21.0278);
    expect(persisted.location.longitude).toBe(105.8342);
  });

  it('createDonor stamps location.updatedAt', async () => {
    createMock.mockResolvedValue({ userId: 'u1' });

    await createDonor(input);

    expect(createMock.mock.calls[0][0].location.updatedAt).toBeInstanceOf(Date);
  });

  it('findDonorByUserId queries by userId and returns a lean document', async () => {
    await findDonorByUserId('u1');

    expect(findOneMock).toHaveBeenCalledWith({ userId: 'u1' });
    expect(leanMock).toHaveBeenCalled();
  });

  describe('updateDonor', () => {
    it('updates by userId and returns the new lean document', async () => {
      await updateDonor('u1', { companyName: 'New Name Ltd' });

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        { userId: 'u1' },
        { companyName: 'New Name Ltd' },
        { new: true }
      );
      expect(leanMock).toHaveBeenCalled();
    });

    it('stamps location.updatedAt when a new location is given', async () => {
      await updateDonor('u1', { location: { latitude: 21.0278, longitude: 105.8342 } });

      const [, update] = findOneAndUpdateMock.mock.calls[0];

      expect(update.location.latitude).toBe(21.0278);
      expect(update.location.longitude).toBe(105.8342);
      expect(update.location.updatedAt).toBeInstanceOf(Date);
    });

    it('does not touch location when it is not part of the patch', async () => {
      await updateDonor('u1', { addressText: '99 Lê Lợi' });

      const [, update] = findOneAndUpdateMock.mock.calls[0];

      expect(update).not.toHaveProperty('location');
    });
  });
});
